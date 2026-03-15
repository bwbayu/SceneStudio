import uuid, asyncio
from fastapi import APIRouter, HTTPException

from models import (
    AnswerRequest,
    QAPair,
    SessionResponse,
    SessionState,
    StartRequest,
    StoryBoard,
)

from api.firestore.firestoreService import firestore_service
from api.story_board.storyBoardService import storyBoardService
from api.utils import _to_response, _get_session

router = APIRouter(
    prefix="/session",
    tags=["Story board session"],
)

# In-memory session store: session_id -> SessionState
_sessions: dict[str, SessionState] = {}

# define story board service (singleton)
_storyboard_service = storyBoardService()

# Background tasks tracker: session_id -> asyncio.Task
_pipeline_tasks: dict[str, asyncio.Task] = {}

@router.post("/start", response_model=SessionResponse)
async def start_session(request: StartRequest) -> SessionResponse:
    """Submit a raw script to begin the storyboard generation pipeline."""
    if not request.script.strip():
        raise HTTPException(status_code=400, detail="Script cannot be empty")

    session_id = str(uuid.uuid4())
    session = SessionState(
        session_id=session_id,
        creator_id=request.creator_id,
        script=request.script.strip(),
    )
    _sessions[session_id] = session

    # Persist session to Firestore
    await firestore_service.create_session(
        session_id=session_id,
        creator_id=request.creator_id,
        script=session.script,
    )

    return await _storyboard_service.run_agent_pipeline(session, _pipeline_tasks)


@router.post("/{session_id}/answer", response_model=SessionResponse)
async def answer_questions(session_id: str, request: AnswerRequest) -> SessionResponse:
    """Provide answers to the Director's clarifying questions."""
    session = _get_session(_sessions, session_id)

    if session.status not in ("clarifying"):
        raise HTTPException(
            status_code=400,
            detail=f"Session is in '{session.status}' state — answers not expected now.",
        )

    if not request.answers:
        raise HTTPException(status_code=400, detail="Answers cannot be empty")

    # Append answers to Q&A history
    for qa in request.answers:
        session.qa_history.append(QAPair(question=qa.question, selected_options=qa.selected_options))

    # Sync Q&A history to Firestore
    await firestore_service.update_session_qa_history(
        session_id,
        [{"question": qa.question, "selected_options": qa.selected_options} for qa in session.qa_history],
    )

    return await _storyboard_service.run_agent_pipeline(session, _pipeline_tasks)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str) -> SessionResponse:
    """Poll for the current session state (useful while pipeline is processing)."""
    # Try in-memory first (active session)
    session = _sessions.get(session_id)

    # Fallback to Firestore if not in memory (e.g. after server restart)
    if session is None:
        session_data = await firestore_service.get_session(session_id)
        if session_data is None:
            raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

        # Reconstruct session from Firestore
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
        # Cache back into memory
        _sessions[session_id] = session

    return _to_response(session)
