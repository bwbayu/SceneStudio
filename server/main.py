"""
Cine-Agent API — FastAPI server for the multi-agent storyboard generation pipeline.

Endpoints:
  POST /api/session/start          — submit a raw script, begin clarification
  POST /api/session/{id}/answer    — answer the Director's questions, continue pipeline
  GET  /api/session/{id}           — retrieve current session state
"""

from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.story_board.storyBoardRoute import _pipeline_tasks, router as storyBoardRoute
from api.story_board.storyBoardConsumerRoute import router as storyBoardConsumerRoute
from api.actor.actorRoute import router as actorRoute
from api.theme.themeRoute import router as themeRoute

load_dotenv()

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

# register route
app.include_router(storyBoardRoute, prefix="/api")
app.include_router(storyBoardConsumerRoute, prefix="/api")
app.include_router(actorRoute, prefix="/api")
app.include_router(themeRoute, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok"}
