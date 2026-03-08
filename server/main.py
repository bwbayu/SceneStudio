"""
Cine-Agent API — FastAPI server for the multi-agent storyboard generation pipeline.

Endpoints:
  POST /api/session/start          — submit a raw script, begin clarification
  POST /api/session/{id}/answer    — answer the Director's questions, continue pipeline
  GET  /api/session/{id}           — retrieve current session state
"""

import asyncio
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    AnswerRequest,
    QAPair,
    SessionResponse,
    SessionState,
    StartRequest,
)
from orchestrator import run_director_round, run_production_pipeline
from storage import GCSStorageService

from pathlib import Path
from services import generate_and_save_actor_images

load_dotenv()

# In-memory session store: session_id -> SessionState
_sessions: dict[str, SessionState] = {}

# Background tasks tracker: session_id -> asyncio.Task
_pipeline_tasks: dict[str, asyncio.Task] = {}

# GCS storage service (singleton)
_storage = GCSStorageService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Cancel any running pipeline tasks on shutdown
    for task in _pipeline_tasks.values():
        task.cancel()


app = FastAPI(
    title="Cine-Agent API",
    description="AI-powered interactive storyboard generation using multi-agent orchestration",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_session(session_id: str) -> SessionState:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    return session


def _to_response(session: SessionState) -> SessionResponse:
    return SessionResponse(
        session_id=session.session_id,
        status=session.status,
        questions=None,  # Only set when status == "questions"
        storyboard=session.storyboard,
        error=session.error,
    )


async def _run_director_and_advance(session: SessionState) -> SessionResponse:
    """
    Call the Director with the current script + Q&A history.
    If the Director asks questions, update session and return them.
    If the Director is ready, kick off the production pipeline in the background.
    """
    try:
        director_output = await run_director_round(session.script, session.qa_history)
    except Exception as e:
        session.status = "error"
        session.error = f"Director agent failed: {e}"
        return _to_response(session)

    if director_output.status == "questions" and director_output.questions:
        session.status = "clarifying"
        return SessionResponse(
            session_id=session.session_id,
            status="questions",
            questions=director_output.questions,
        )

    # Director is satisfied — launch the production pipeline
    if director_output.analysis is None:
        session.status = "error"
        session.error = "Director returned 'ready' but provided no analysis."
        return _to_response(session)

    session.status = "processing"
    analysis = director_output.analysis

    async def _pipeline():
        try:
            storyboard = await run_production_pipeline(session.script, analysis)
            session.storyboard = storyboard
            session.status = "complete"
        except Exception as e:
            session.status = "error"
            session.error = f"Production pipeline failed: {e}"

    task = asyncio.create_task(_pipeline())
    _pipeline_tasks[session.session_id] = task

    return SessionResponse(
        session_id=session.session_id,
        status="processing",
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.post("/api/session/start", response_model=SessionResponse)
async def start_session(request: StartRequest) -> SessionResponse:
    """Submit a raw script to begin the storyboard generation pipeline."""
    if not request.script.strip():
        raise HTTPException(status_code=400, detail="Script cannot be empty")

    session_id = str(uuid.uuid4())
    session = SessionState(session_id=session_id, script=request.script.strip())
    _sessions[session_id] = session

    return await _run_director_and_advance(session)


@app.post("/api/session/{session_id}/answer", response_model=SessionResponse)
async def answer_questions(session_id: str, request: AnswerRequest) -> SessionResponse:
    """Provide answers to the Director's clarifying questions."""
    session = _get_session(session_id)

    if session.status not in ("clarifying", "pending"):
        raise HTTPException(
            status_code=400,
            detail=f"Session is in '{session.status}' state — answers not expected now.",
        )

    if not request.answers:
        raise HTTPException(status_code=400, detail="Answers cannot be empty")

    # Append answers to Q&A history
    for qa in request.answers:
        session.qa_history.append(QAPair(question=qa.question, selected_options=qa.selected_options))

    return await _run_director_and_advance(session)


@app.get("/api/session/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str) -> SessionResponse:
    """Poll for the current session state (useful while pipeline is processing)."""
    session = _get_session(session_id)
    if session.storyboard:
        _storage.refresh_signed_urls_for_storyboard(session.storyboard)
    return _to_response(session)

@app.post("/api/generate-cast-images")
async def generate_cast_images():
    """
    Menghasilkan gambar karakter menggunakan Gemini 3 Flash Image 
    berdasarkan deskripsi fisik dan pakaian di storyboard.
    """
    file_path = Path("result-example.json")

    template_path = Path("template/character_template.png")

    try:
        updated_actors = await generate_and_save_actor_images(file_path, template_path)
        return {
            "message": "Images generated successfully", 
            "actors": updated_actors
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}
