"""
Firestore service for SceneStudio.

Handles persistence for sessions (pipeline state) and storyboards (published content).
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from google.cloud.firestore_v1 import AsyncClient, FieldFilter
from google.oauth2 import service_account

# Reuse the same service account key file as GCS
_CREDENTIALS_PATH = os.environ.get(
    "GCP_SA_KEY_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "keys", "gemini-hackathon.json"),
)


class FirestoreService:
    """
    Async Firestore wrapper for SceneStudio session and storyboard persistence.
    """

    def __init__(self, credentials_path: str = _CREDENTIALS_PATH) -> None:
        """Load GCP service account credentials and initialise the Firestore async client."""
        self._credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        db_name = os.environ.get("FIRESTORE_DATABASE")
        self._db = AsyncClient(credentials=self._credentials, database=db_name)

    # ------------------------------------------------------------------
    # Sessions collection
    # ------------------------------------------------------------------

    async def create_session(
        self, session_id: str, creator_id: str, script: str
    ) -> None:
        """Create a new session document in Firestore with status='pending'."""
        now = datetime.now(timezone.utc)
        await self._db.collection("sessions").document(session_id).set(
            {
                "session_id": session_id,
                "creator_id": creator_id,
                "script": script,
                "qa_history": [],
                "status": "pending",
                "error": None,
                "story_id": None,
                "created_at": now,
                "updated_at": now,
            }
        )

    async def update_session_status(
        self, session_id: str, status: str, **extra
    ) -> None:
        """Update session status and any extra fields (e.g. story_id, error)."""
        data = {"status": status, "updated_at": datetime.now(timezone.utc)}
        data.update(extra)
        await self._db.collection("sessions").document(session_id).update(data)

    async def update_session_qa_history(
        self, session_id: str, qa_history: list[dict]
    ) -> None:
        """Overwrite the qa_history array for a session after the user submits answers."""
        await self._db.collection("sessions").document(session_id).update(
            {
                "qa_history": qa_history,
                "updated_at": datetime.now(timezone.utc),
            }
        )

    async def get_session(self, session_id: str) -> Optional[dict]:
        """Fetch a session document by ID. Returns None if not found."""
        doc = await self._db.collection("sessions").document(session_id).get()
        return doc.to_dict() if doc.exists else None

    # ------------------------------------------------------------------
    # Storyboards collection
    # ------------------------------------------------------------------

    async def create_storyboard(
        self,
        story_id: str,
        session_id: str,
        creator_id: str,
        title: str,
        storyboard_data: dict,
    ) -> None:
        """Persist the assembled storyboard to Firestore with status='generating'."""
        await self._db.collection("storyboards").document(story_id).set(
            {
                "story_id": story_id,
                "session_id": session_id,
                "creator_id": creator_id,
                "title": title,
                "status": "generating",
                "thumbnail_gcs_uri": storyboard_data.get("thumbnail_gcs_uri"),
                "thumbnail_url": storyboard_data.get("thumbnail_url"),
                "actors": storyboard_data.get("actors", []),
                "themes": storyboard_data.get("themes", []),
                "scenes": storyboard_data.get("scenes", []),
                "created_at": datetime.now(timezone.utc),
            }
        )

    async def update_storyboard_status(self, story_id: str, status: str) -> None:
        """Update storyboard status (e.g. 'generating' → 'ready')."""
        await self._db.collection("storyboards").document(story_id).update(
            {"status": status}
        )

    async def update_actor_image(
        self, story_id: str, actor_id: str, gcs_uri: str, public_url: str
    ) -> None:
        """Write the GCS URI and public URL of a generated actor image into the actors array in-place."""
        doc_ref = self._db.collection("storyboards").document(story_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return
        data = doc.to_dict()
        for actor in data.get("actors", []):
            if actor.get("actor_id") == actor_id:
                actor["anchor_image_gcs_uri"] = gcs_uri
                actor["anchor_image_url"] = public_url
                break
        await doc_ref.update({"actors": data["actors"]})

    async def update_theme_image(
        self, story_id: str, theme_id: str, gcs_uri: str, public_url: str
    ) -> None:
        """Write the GCS URI and public URL of a generated theme image into the themes array in-place."""
        doc_ref = self._db.collection("storyboards").document(story_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return
        data = doc.to_dict()
        for theme in data.get("themes", []):
            if theme.get("theme_id") == theme_id:
                theme["reference_image_gcs_uri"] = gcs_uri
                theme["reference_image_url"] = public_url
                break
        await doc_ref.update({"themes": data["themes"]})

    async def update_segment_video(
        self, story_id: str, scene_id: str, segment_index: int, gcs_uri: str, public_url: str
    ) -> None:
        """Write the GCS URI and public URL of a generated video segment into the scenes array in-place."""
        doc_ref = self._db.collection("storyboards").document(story_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return
        data = doc.to_dict()
        for scene in data.get("scenes", []):
            if scene.get("scene_id") == scene_id:
                for segment in scene.get("segments", []):
                    if segment.get("segment_index") == segment_index:
                        segment["video_gcs_uri"] = gcs_uri
                        segment["video_url"] = public_url
                        break
                break
        await doc_ref.update({"scenes": data["scenes"]})

    async def update_scene_video(
        self, story_id: str, scene_id: str, gcs_uri: str, public_url: str
    ) -> None:
        """Write the GCS URI and public URL of a merged scene video into the scenes array in-place."""
        doc_ref = self._db.collection("storyboards").document(story_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return
        data = doc.to_dict()
        for scene in data.get("scenes", []):
            if scene.get("scene_id") == scene_id:
                scene["video_gcs_uri"] = gcs_uri
                scene["video_url"] = public_url
                break
        await doc_ref.update({"scenes": data["scenes"]})

    async def update_scene_thumbnail(
        self, story_id: str, scene_id: str, gcs_uri: str, public_url: str
    ) -> None:
        """Write the GCS URI and public URL of a scene thumbnail into the scenes array in-place."""
        doc_ref = self._db.collection("storyboards").document(story_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return
        data = doc.to_dict()
        for scene in data.get("scenes", []):
            if scene.get("scene_id") == scene_id:
                scene["thumbnail_gcs_uri"] = gcs_uri
                scene["thumbnail_url"] = public_url
                break
        await doc_ref.update({"scenes": data["scenes"]})

    async def add_scene_to_storyboard(self, story_id: str, scene) -> None:
        """Append a new Scene to the storyboard's scenes array in Firestore."""
        doc_ref = self._db.collection("storyboards").document(story_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return
        data = doc.to_dict()
        scenes = data.get("scenes", [])
        scenes.append(scene.model_dump())
        await doc_ref.update({"scenes": scenes, "updated_at": datetime.now(timezone.utc)})

    async def update_scene_choices(self, story_id: str, scene_id: str, new_choice) -> None:
        """Add a new Choice to an existing scene's choices list in Firestore."""
        doc_ref = self._db.collection("storyboards").document(story_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return
        data = doc.to_dict()
        for scene in data.get("scenes", []):
            if scene.get("scene_id") == scene_id:
                choices = scene.get("choices", [])
                choices.append(new_choice.model_dump())
                scene["choices"] = choices
                break
        await doc_ref.update({"scenes": data["scenes"], "updated_at": datetime.now(timezone.utc)})

    async def get_storyboard(self, story_id: str) -> Optional[dict]:
        """Fetch a storyboard document by ID. Returns None if not found."""
        doc = await self._db.collection("storyboards").document(story_id).get()
        return doc.to_dict() if doc.exists else None

    async def list_storyboards(self) -> list[dict]:
        """
        List all storyboard summary records.
        Returns lightweight dicts (story_id, title, creator_id, status, created_at).
        """
        query = self._db.collection("storyboards")
        docs = []
        async for doc in query.stream():
            data = doc.to_dict()
            docs.append(
                {
                    "story_id": data.get("story_id"),
                    "session_id": data.get("session_id"),
                    "title": data.get("title"),
                    "creator_id": data.get("creator_id"),
                    "status": data.get("status"),
                    "created_at": data.get("created_at"),
                    "thumbnail_url": data.get("thumbnail_url"),
                }
            )
        return docs


firestore_service = FirestoreService()
