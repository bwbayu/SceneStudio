"""
Pipeline orchestrator for Cine-Agent.

Manages:
1. Multi-round Director clarification loop (API-level, stateless per call)
2. Parallel execution of Screenwriter, Casting, and Production Designer agents
3. Sequential execution of Segment Engineer after the parallel phase
4. Assembly of the final StoryBoard JSON
"""

import asyncio
import json
import uuid

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from models import (
    DirectorOutput,
    DirectorAnalysis,
    ScreenwriterOutput,
    CastingOutput,
    DesignerOutput,
    SegmentEngineerOutput,
    StoryBoard,
    QAPair,
)
from agents import (
    director_agent,
    screenwriter_agent,
    casting_agent,
    production_designer_agent,
    segment_engineer_agent,
)

APP_NAME = "cine-agent"
_session_service = InMemorySessionService()


async def _call_agent(agent, message: str) -> str:
    """Run a single stateless agent invocation and return the final response text."""
    session_id = str(uuid.uuid4())
    user_id = "pipeline"

    await _session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
    )

    runner = Runner(
        agent=agent,
        app_name=APP_NAME,
        session_service=_session_service,
    )

    content = types.Content(role="user", parts=[types.Part(text=message)])

    response_text = ""
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=content,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            for part in event.content.parts:
                if hasattr(part, "text") and part.text:
                    response_text = part.text
                    break

    return response_text


async def run_director_round(script: str, qa_history: list[QAPair]) -> DirectorOutput:
    """
    Call the Director agent with the script and Q&A history.
    Returns either questions to ask the user or a complete production analysis.
    """
    payload = {
        "script": script,
        "qa_history": [{"question": qa.question, "selected_options": qa.selected_options} for qa in qa_history],
    }
    response = await _call_agent(director_agent, json.dumps(payload, ensure_ascii=False))

    # ADK with output_schema returns JSON; parse it into our Pydantic model
    # Strip markdown code fences if the model wraps the JSON
    cleaned = response.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    return DirectorOutput.model_validate_json(cleaned)


async def run_production_pipeline(
    script: str, analysis: DirectorAnalysis
) -> StoryBoard:
    """
    Run the full production pipeline:
    1. Parallel: Screenwriter + Casting + Production Designer
    2. Sequential: Segment Engineer
    3. Assemble and return StoryBoard
    """
    specialist_payload = json.dumps(
        {
            "script": script,
            "analysis": analysis.model_dump(),
        },
        ensure_ascii=False,
    )

    # Phase 2: Parallel execution of the three specialist agents
    screenwriter_task = _call_agent(screenwriter_agent, specialist_payload)
    casting_task = _call_agent(casting_agent, specialist_payload)
    designer_task = _call_agent(production_designer_agent, specialist_payload)

    screenwriter_raw, casting_raw, designer_raw = await asyncio.gather(
        screenwriter_task, casting_task, designer_task
    )

    scenes_output = ScreenwriterOutput.model_validate_json(_clean_json(screenwriter_raw))
    casting_output = CastingOutput.model_validate_json(_clean_json(casting_raw))
    designer_output = DesignerOutput.model_validate_json(_clean_json(designer_raw))

    # Phase 3: Segment Engineer fills in the video segments for each scene
    engineer_payload = json.dumps(
        {
            "scenes": [s.model_dump() for s in scenes_output.scenes],
            "actors": [a.model_dump() for a in casting_output.actors],
            "themes": [t.model_dump() for t in designer_output.themes],
        },
        ensure_ascii=False,
    )

    engineer_raw = await _call_agent(segment_engineer_agent, engineer_payload)
    engineer_output = SegmentEngineerOutput.model_validate_json(_clean_json(engineer_raw))

    # Assemble final StoryBoard
    story_id = str(uuid.uuid4())
    title = _derive_title(analysis)

    return StoryBoard(
        story_id=story_id,
        title=title,
        actors=casting_output.actors,
        themes=designer_output.themes,
        scenes=engineer_output.scenes,
    )


def _clean_json(text: str) -> str:
    """Strip markdown code fences that some models add around JSON responses."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove opening fence (```json or ```) and closing fence
        start = 1
        end = len(lines)
        if lines[-1].strip() == "```":
            end = len(lines) - 1
        cleaned = "\n".join(lines[start:end])
    return cleaned


def _derive_title(analysis: DirectorAnalysis) -> str:
    """Derive a story title from the Director's narrative summary."""
    # Use the first few words of the narrative summary as the title base,
    # or fall back to genre + setting
    summary_words = analysis.narrative_summary.split()
    if len(summary_words) >= 4:
        return " ".join(summary_words[:4]).rstrip(".,;:") + "..."
    return f"{analysis.genre.title()}: {analysis.setting}"
