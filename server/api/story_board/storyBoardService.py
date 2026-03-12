from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
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
    SessionState,
    SessionResponse
)

from agents import (
    director_agent,
    screenwriter_agent,
    casting_agent,
    production_designer_agent,
    segment_engineer_agent,
)


from api.utils import _clean_json, _derive_title, _to_response
from api.firestore.firestoreService import firestore_service

import uuid, json, asyncio

APP_NAME = "cine-agent"

class storyBoardService:
    """
    Pipeline orchestrator for Cine-Agent.

    Manages:
    1. Multi-round Director clarification loop (API-level, stateless per call)
    2. Parallel execution of Screenwriter, Casting, and Production Designer agents
    3. Sequential execution of Segment Engineer after the parallel phase
    4. Assembly of the final StoryBoard JSON
    """
    def __init__(self):
        """Initialise the Google ADK in-memory session service used by all agent runners."""
        self._session_service = InMemorySessionService()

    async def _call_agent(self, agent, message: str) -> str:
        """Run a single stateless agent invocation and return the final response text."""
        session_id = str(uuid.uuid4())
        user_id = "pipeline"

        await self._session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )

        runner = Runner(
            agent=agent,
            app_name=APP_NAME,
            session_service=self._session_service,
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

    async def _run_director_agent(self, script: str, qa_history: list[QAPair]) -> DirectorOutput:
        """
        Call the Director agent with the script and Q&A history.
        Returns either questions to ask the user or a complete production analysis.
        """
        payload = {
            "script": script,
            "qa_history": [{"question": qa.question, "selected_options": qa.selected_options} for qa in qa_history],
        }
        response = await self._call_agent(director_agent, json.dumps(payload, ensure_ascii=False))

        cleaned = response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

        return DirectorOutput.model_validate_json(cleaned)

    async def _run_multi_agent(
        self, session: SessionState, analysis: DirectorAnalysis
    ) -> StoryBoard:
        """
        Run the full production pipeline:
        1. Parallel: Screenwriter + Casting + Production Designer
        2. Sequential: Segment Engineer
        3. Assemble and return StoryBoard
        4. Persist to Firestore
        """
        specialist_payload = json.dumps(
            {
                "script": session.script,
                "analysis": analysis.model_dump(),
            },
            ensure_ascii=False,
        )

        # Phase 2: Parallel execution of the three specialist agents
        screenwriter_task = self._call_agent(screenwriter_agent, specialist_payload)
        casting_task = self._call_agent(casting_agent, specialist_payload)
        designer_task = self._call_agent(production_designer_agent, specialist_payload)

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

        engineer_raw = await self._call_agent(segment_engineer_agent, engineer_payload)
        engineer_output = SegmentEngineerOutput.model_validate_json(_clean_json(engineer_raw))

        # Assemble final StoryBoard
        story_id = str(uuid.uuid4())
        title = _derive_title(analysis)

        storyboard = StoryBoard(
            story_id=story_id,
            title=title,
            actors=casting_output.actors,
            themes=designer_output.themes,
            scenes=engineer_output.scenes,
        )

        # Persist storyboard to Firestore
        await firestore_service.create_storyboard(
            story_id=story_id,
            session_id=session.session_id,
            creator_id=session.creator_id,
            title=title,
            storyboard_data=storyboard.model_dump(),
        )

        # Link story_id back to session
        session.story_id = story_id
        await firestore_service.update_session_status(
            session.session_id, "processing_assets", story_id=story_id
        )

        return storyboard

    async def run_agent_pipeline(self, session: SessionState, pipeline_tasks: dict[str, asyncio.Task]) -> SessionResponse:
        """
        Call the Director with the current script + Q&A history.
        If the Director asks questions, update session and return them.
        If the Director is ready, kick off the production pipeline in the background.
        """
        # run director agent
        try:
            director_output = await self._run_director_agent(session.script, session.qa_history)
        except Exception as e:
            session.status = "error"
            session.error = f"Director agent failed: {e}"
            await firestore_service.update_session_status(
                session.session_id, "error", error=str(e)
            )
            return _to_response(session)

        # director got question, return the question and wait for user response
        if director_output.status == "questions" and director_output.questions:
            session.status = "clarifying"
            await firestore_service.update_session_status(session.session_id, "clarifying")
            return SessionResponse(
                session_id=session.session_id,
                status="questions",
                questions=director_output.questions,
            )

        # director is satisfied, run the multi-agent pipeline
        if director_output.analysis is None:
            session.status = "error"
            session.error = "Director returned 'ready' but provided no analysis."
            await firestore_service.update_session_status(
                session.session_id, "error", error=session.error
            )
            return _to_response(session)

        session.status = "processing_agents"
        analysis = director_output.analysis
        await firestore_service.update_session_status(session.session_id, "processing_agents")

        # run the multi-agent in background, change status to complete if pipeline is done
        async def _pipeline():
            """Background coroutine: runs the full multi-agent pipeline and updates session + Firestore on completion or error."""
            try:
                storyboard = await self._run_multi_agent(session, analysis)
                session.storyboard = storyboard
                session.status = "complete"
                await firestore_service.update_session_status(session.session_id, "complete")
                await firestore_service.update_storyboard_status(storyboard.story_id, "ready")
            except Exception as e:
                session.status = "error"
                session.error = f"Production pipeline failed: {e}"
                await firestore_service.update_session_status(
                    session.session_id, "error", error=str(e)
                )

        # create background task when running multi-agent
        task = asyncio.create_task(_pipeline())
        pipeline_tasks[session.session_id] = task

        # return processing first while waiting the background multi-agent task is done
        return SessionResponse(
            session_id=session.session_id,
            status="processing",
        )
