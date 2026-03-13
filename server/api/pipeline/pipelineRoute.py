"""
Full end-to-end generation pipeline endpoints.

Endpoints:
  POST /api/pipeline/start              — submit a script, begin the full pipeline
  POST /api/pipeline/{session_id}/answer — answer the Director's clarifying questions
  GET  /api/pipeline/status/{session_id} — poll current pipeline stage
"""

import uuid
import asyncio

from fastapi import APIRouter, HTTPException

from models import (
    AnswerRequest,
    QAPair,
    SessionResponse,
    SessionState,
    StartRequest,
    StoryBoard,
    PipelineStatusResponse,
)

from api.firestore.firestoreService import firestore_service
from api.pipeline.pipelineService import PipelineService

router = APIRouter(
    prefix="/pipeline",
    tags=["Full generation pipeline"],
)

# In-memory session store: session_id -> SessionState
_sessions: dict[str, SessionState] = {}

# Singleton pipeline service
_pipeline_service = PipelineService()

# Background tasks tracker: session_id -> asyncio.Task
_pipeline_tasks: dict[str, asyncio.Task] = {}


@router.post("/start", response_model=SessionResponse)
async def start_pipeline(request: StartRequest) -> SessionResponse:
    """
    Submit a script to begin the full end-to-end generation pipeline.

    Runs: director Q&A → multi-agent storyboard assembly →
          actor/theme image generation → scene video generation.

    Returns immediately. If the Director needs clarification, status='questions'
    is returned with the questions. Otherwise status='processing' while the
    pipeline runs in the background.
    """
    if not request.script.strip():
        raise HTTPException(status_code=400, detail="Script cannot be empty")

    session_id = str(uuid.uuid4())
    session = SessionState(
        session_id=session_id,
        creator_id=request.creator_id,
        script=request.script.strip(),
    )
    _sessions[session_id] = session

    await firestore_service.create_session(
        session_id=session_id,
        creator_id=request.creator_id,
        script=session.script,
    )

    return await _pipeline_service.run_full_pipeline(session, _pipeline_tasks)


@router.post("/{session_id}/answer", response_model=SessionResponse)
async def answer_questions(session_id: str, request: AnswerRequest) -> SessionResponse:
    """
    Provide answers to the Director's clarifying questions to continue the pipeline.
    """
    session = _sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    if session.status != "clarifying":
        raise HTTPException(
            status_code=400,
            detail=f"Session is in '{session.status}' state — answers not expected now.",
        )

    if not request.answers:
        raise HTTPException(status_code=400, detail="Answers cannot be empty")

    for qa in request.answers:
        session.qa_history.append(
            QAPair(question=qa.question, selected_options=qa.selected_options)
        )

    await firestore_service.update_session_qa_history(
        session_id,
        [{"question": qa.question, "selected_options": qa.selected_options} for qa in session.qa_history],
    )

    return await _pipeline_service.run_full_pipeline(session, _pipeline_tasks)


@router.get("/status/{session_id}", response_model=PipelineStatusResponse)
async def get_pipeline_status(session_id: str) -> PipelineStatusResponse:
    """
    Poll the current stage of the full generation pipeline.

    Status values:
      pending | clarifying | processing_agents | processing_assets |
      generating_images | generating_videos | generation_complete | error
    """
    # Try in-memory first
    session = _sessions.get(session_id)

    if session is None:
        # Fallback to Firestore (e.g. after server restart)
        session_data = await firestore_service.get_session(session_id)
        if session_data is None:
            raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

        storyboard = None
        if session_data.get("story_id"):
            sb_data = await firestore_service.get_storyboard(session_data["story_id"])
            if sb_data:
                storyboard = StoryBoard(**sb_data)

        session = SessionState(
            session_id=session_data["session_id"],
            creator_id=session_data.get("creator_id", "anonymous"),
            script=session_data["script"],
            qa_history=[QAPair(**qa) for qa in session_data.get("qa_history", [])],
            status=session_data["status"],
            story_id=session_data.get("story_id"),
            storyboard=storyboard,
            error=session_data.get("error"),
        )
        _sessions[session_id] = session

    return PipelineStatusResponse(
        session_id=session.session_id,
        story_id=session.story_id,
        status=session.status,
        error=session.error,
    )
