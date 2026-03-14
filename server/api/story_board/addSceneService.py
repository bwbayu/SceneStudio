"""
Add Scene service for Cine-Agent.

Handles the pipeline for adding a single new scene to an existing storyboard:
  1. Scene Director agent — clarification Q&A loop
  2. Scene Writer agent — generates scene title and summary
  3. Segment Engineer — breaks scene into 3 video segments
  4. Firestore — appends the new scene and updates prev-scene choices
"""

from __future__ import annotations

import uuid, json

from models import (
    AddSceneState,
    AddSceneResponse,
    Choice,
    DirectorOutput,
    QAPair,
    SceneBlueprint,
    SceneWriterOutput,
    SegmentEngineerOutput,
    SessionState,
    StoryBoard,
)

from agents import scene_director_agent, scene_writer_agent, segment_engineer_agent
from api.story_board.storyBoardService import storyBoardService
from api.firestore.firestoreService import firestore_service
from api.utils import _clean_json

import asyncio


class AddSceneService:
    """Orchestrates the add-scene pipeline using the scene director + writer agents."""

    def __init__(self):
        self._storyboard_service = storyBoardService()

    # ------------------------------------------------------------------
    # Agent calls
    # ------------------------------------------------------------------

    async def _run_scene_director(
        self,
        scene_description: str,
        storyboard: StoryBoard,
        actor_ids: list[str],
        theme_id: str | None,
        prev_scene_ids: list[str],
        next_scene_ids: list[str],
        qa_history: list[QAPair],
    ) -> DirectorOutput:
        """Call the Scene Director agent; returns questions or a production brief."""
        # Build story context summary
        existing_scenes = [
            {"title": s.title, "summary": s.segments[0].action_description if s.segments else ""}
            for s in storyboard.scenes
        ]
        available_actors = [
            {"name": a.name, "physical_description": a.physical_description}
            for a in storyboard.actors
            if a.actor_id in actor_ids
        ] if actor_ids else [
            {"name": a.name, "physical_description": a.physical_description}
            for a in storyboard.actors
        ]
        available_themes = [
            {"location_name": t.location_name, "atmosphere": t.atmosphere}
            for t in storyboard.themes
            if theme_id is None or t.theme_id == theme_id
        ]

        prev_titles = [s.title for s in storyboard.scenes if s.scene_id in prev_scene_ids]
        next_titles = [s.title for s in storyboard.scenes if s.scene_id in next_scene_ids]

        payload = {
            "scene_description": scene_description,
            "story_context": {
                "title": storyboard.title,
                "existing_scenes": existing_scenes,
            },
            "available_actors": available_actors,
            "available_themes": available_themes,
            "prev_scenes": prev_titles,
            "next_scenes": next_titles,
            "qa_history": [
                {"question": qa.question, "selected_options": qa.selected_options}
                for qa in qa_history
            ],
        }

        response = await self._storyboard_service._call_agent(
            scene_director_agent, json.dumps(payload, ensure_ascii=False)
        )
        return DirectorOutput.model_validate_json(_clean_json(response))

    async def _run_scene_writer(
        self,
        scene_description: str,
        storyboard: StoryBoard,
        director_analysis,
        prev_scene_ids: list[str],
        next_scene_ids: list[str],
    ) -> SceneWriterOutput:
        """Call the Scene Writer agent; returns title and summary for the new scene."""
        existing_scenes = [
            {"title": s.title, "summary": s.segments[0].action_description if s.segments else ""}
            for s in storyboard.scenes
        ]
        available_actors = [
            {"name": a.name, "physical_description": a.physical_description}
            for a in storyboard.actors
        ]
        available_themes = [
            {"location_name": t.location_name, "atmosphere": t.atmosphere}
            for t in storyboard.themes
        ]
        prev_titles = [s.title for s in storyboard.scenes if s.scene_id in prev_scene_ids]
        next_titles = [s.title for s in storyboard.scenes if s.scene_id in next_scene_ids]

        payload = {
            "scene_description": scene_description,
            "story_context": {
                "title": storyboard.title,
                "existing_scenes": existing_scenes,
            },
            "director_analysis": director_analysis.model_dump() if director_analysis else {},
            "available_actors": available_actors,
            "available_themes": available_themes,
            "prev_scene_titles": prev_titles,
            "next_scene_titles": next_titles,
        }

        response = await self._storyboard_service._call_agent(
            scene_writer_agent, json.dumps(payload, ensure_ascii=False)
        )
        return SceneWriterOutput.model_validate_json(_clean_json(response))

    async def _run_segment_engineer_single(
        self,
        blueprint: SceneBlueprint,
        storyboard: StoryBoard,
        actor_ids: list[str],
        theme_id: str | None,
    ) -> SegmentEngineerOutput:
        """Run the Segment Engineer on a single scene blueprint."""
        # Filter actors and themes to only selected ones
        selected_actors = [a for a in storyboard.actors if a.actor_id in actor_ids]
        selected_themes = [t for t in storyboard.themes if theme_id is None or t.theme_id == theme_id]

        payload = json.dumps(
            {
                "scenes": [blueprint.model_dump()],
                "actors": [a.model_dump() for a in selected_actors],
                "themes": [t.model_dump() for t in selected_themes],
            },
            ensure_ascii=False,
        )

        response = await self._storyboard_service._call_agent(
            segment_engineer_agent, payload
        )
        return SegmentEngineerOutput.model_validate_json(_clean_json(response))

    # ------------------------------------------------------------------
    # Orchestrator
    # ------------------------------------------------------------------

    async def run_add_scene_pipeline(
        self,
        session: SessionState,
        storyboard: StoryBoard,
        add_scene_state: AddSceneState,
    ) -> AddSceneResponse:
        """
        Run the add-scene director Q&A loop.

        - If the director asks questions, update add_scene_state and return them.
        - If the director is satisfied, kick off the background generation task.
        """
        try:
            director_output = await self._run_scene_director(
                scene_description=add_scene_state.scene_description,
                storyboard=storyboard,
                actor_ids=add_scene_state.actor_ids,
                theme_id=add_scene_state.theme_id,
                prev_scene_ids=add_scene_state.prev_scene_ids,
                next_scene_ids=add_scene_state.next_scene_ids,
                qa_history=add_scene_state.qa_history,
            )
        except Exception as e:
            add_scene_state.status = "error"
            add_scene_state.error = f"Scene Director agent failed: {e}"
            return AddSceneResponse(status="error", error=add_scene_state.error)

        if director_output.status == "questions" and director_output.questions:
            add_scene_state.status = "clarifying"
            return AddSceneResponse(
                status="questions",
                questions=director_output.questions,
            )

        if director_output.analysis is None:
            add_scene_state.status = "error"
            add_scene_state.error = "Scene Director returned 'ready' but provided no analysis."
            return AddSceneResponse(status="error", error=add_scene_state.error)

        analysis = director_output.analysis
        add_scene_state.status = "processing"

        # Run the generation in background
        async def _generate():
            try:
                # Step 1: Scene Writer
                writer_output = await self._run_scene_writer(
                    scene_description=add_scene_state.scene_description,
                    storyboard=storyboard,
                    director_analysis=analysis,
                    prev_scene_ids=add_scene_state.prev_scene_ids,
                    next_scene_ids=add_scene_state.next_scene_ids,
                )

                # Step 2: Build SceneBlueprint
                new_scene_id = f"scene_{len(storyboard.scenes) + 1:03d}"
                is_ending = len(add_scene_state.next_scene_ids) == 0
                labels_to_next = writer_output.choice_labels_to_next
                choices = [
                    Choice(
                        text=labels_to_next[i] if i < len(labels_to_next) else "Continue",
                        target_scene_id=sid,
                    )
                    for i, sid in enumerate(add_scene_state.next_scene_ids)
                ]
                blueprint = SceneBlueprint(
                    scene_id=new_scene_id,
                    title=writer_output.title,
                    summary=writer_output.summary,
                    choices=choices,
                    is_ending=is_ending,
                )

                # Step 3: Segment Engineer
                engineer_output = await self._run_segment_engineer_single(
                    blueprint=blueprint,
                    storyboard=storyboard,
                    actor_ids=add_scene_state.actor_ids,
                    theme_id=add_scene_state.theme_id,
                )

                if not engineer_output.scenes:
                    raise ValueError("Segment Engineer returned no scenes")

                new_scene = engineer_output.scenes[0]
                # Ensure scene_id matches what we set
                new_scene.scene_id = new_scene_id

                # Step 4: Persist to Firestore
                await firestore_service.add_scene_to_storyboard(storyboard.story_id, new_scene)

                prev_choice_label = writer_output.choice_label_from_prev
                for prev_id in add_scene_state.prev_scene_ids:
                    new_choice = Choice(text=prev_choice_label, target_scene_id=new_scene_id)
                    await firestore_service.update_scene_choices(
                        storyboard.story_id, prev_id, new_choice
                    )

                # Update in-memory storyboard
                storyboard.scenes.append(new_scene)
                for scene in storyboard.scenes:
                    if scene.scene_id in add_scene_state.prev_scene_ids:
                        scene.choices.append(Choice(text=prev_choice_label, target_scene_id=new_scene_id))

                add_scene_state.new_scene_id = new_scene_id
                add_scene_state.status = "complete"

            except Exception as e:
                add_scene_state.status = "error"
                add_scene_state.error = f"Add scene generation failed: {e}"

        asyncio.create_task(_generate())

        return AddSceneResponse(status="processing")


add_scene_service = AddSceneService()
