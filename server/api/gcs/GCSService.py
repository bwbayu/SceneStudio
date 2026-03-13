"""
GCS storage service for Cine-Agent.

Handles actor/theme reference image uploads and signed URL generation.
Videos are written directly to GCS by Veo — this service provides path
helpers for Veo output prefixes and reads back the returned URIs.
"""

from __future__ import annotations

import asyncio
import os
from datetime import timedelta
from functools import partial
from typing import TYPE_CHECKING

from google.cloud import storage
from google.oauth2 import service_account

if TYPE_CHECKING:
    from models import StoryBoard

BUCKET_NAME = "gemini-hackathon-8565416389"
SIGNED_URL_EXPIRY = timedelta(hours=24)
_CREDENTIALS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "keys", "gemini-hackathon.json"
)


class GCSStorageService:
    """
    Thin GCS wrapper for Cine-Agent asset management.

    - Uploads actor/theme reference images (output of Gemini Flash Image generation)
    - Generates signed HTTPS URLs for frontend display
    - Provides path/URI helpers consumed by the Veo generation layer
    """

    def __init__(
        self,
        bucket_name: str = BUCKET_NAME,
        credentials_path: str = _CREDENTIALS_PATH,
    ) -> None:
        self._bucket_name = bucket_name
        self._credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        self._client = storage.Client(credentials=self._credentials)
        self._bucket = self._client.bucket(bucket_name)

    # ------------------------------------------------------------------
    # Path helpers (pure — no I/O)
    # ------------------------------------------------------------------

    def actor_image_path(self, session_id: str, actor_id: str) -> str:
        """Object path (no bucket prefix) for an actor reference image."""
        return f"sessions/{session_id}/actors/{actor_id}.jpg"

    def theme_image_path(self, session_id: str, theme_id: str) -> str:
        """Object path for a theme/location reference image."""
        return f"sessions/{session_id}/themes/{theme_id}.jpg"

    def thumbnail_path(self, session_id: str) -> str:
        """Object path for the storyboard thumbnail image."""
        return f"sessions/{session_id}/thumbnail.jpg"

    def scene_thumbnail_path(self, session_id: str, scene_id: str) -> str:
        """Object path for a scene-level thumbnail image."""
        return f"sessions/{session_id}/scenes/{scene_id}/thumbnail.jpg"

    def segment_output_prefix(self, session_id: str, scene_id: str, segment_index: int) -> str:
        """
        GCS prefix (with trailing slash) to pass as output_gcs_uri in a Veo generate_videos call.
        Veo writes sample_0.mp4 under this prefix; read back the URI from the operation result.

        Example:
            prefix = storage.segment_output_prefix(session_id, "scene_001", 1)
            # → "sessions/{session_id}/scenes/scene_001/seg1/"
            config = GenerateVideosConfig(output_gcs_uri=storage.to_gcs_uri(prefix))
        """
        return f"sessions/{session_id}/scenes/{scene_id}/seg{segment_index}/"

    def to_gcs_uri(self, object_path: str) -> str:
        """Convert an object path (or prefix) to a gs:// URI."""
        return f"gs://{self._bucket_name}/{object_path}"

    # ------------------------------------------------------------------
    # Upload methods (images only — Veo writes videos directly to GCS)
    # ------------------------------------------------------------------

    async def upload_actor_image(
        self,
        session_id: str,
        actor_id: str,
        image_bytes: bytes,
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload an actor reference image to GCS.
        Returns the GCS URI (gs://...) — store this in Actor.anchor_image_gcs_uri.
        """
        object_path = self.actor_image_path(session_id, actor_id)
        await self._upload_bytes(object_path, image_bytes, content_type)
        return self.to_gcs_uri(object_path)

    async def upload_theme_image(
        self,
        session_id: str,
        theme_id: str,
        image_bytes: bytes,
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload a theme/location reference image to GCS.
        Returns the GCS URI (gs://...) — store this in Theme.reference_image_gcs_uri.
        """
        object_path = self.theme_image_path(session_id, theme_id)
        await self._upload_bytes(object_path, image_bytes, content_type)
        return self.to_gcs_uri(object_path)

    async def upload_thumbnail(
        self,
        session_id: str,
        image_bytes: bytes,
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload a storyboard thumbnail image to GCS.
        Returns the GCS URI (gs://...) — store this in StoryBoard.thumbnail_gcs_uri.
        """
        object_path = self.thumbnail_path(session_id)
        await self._upload_bytes(object_path, image_bytes, content_type)
        return self.to_gcs_uri(object_path)

    async def upload_scene_thumbnail(
        self,
        session_id: str,
        scene_id: str,
        image_bytes: bytes,
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload a scene thumbnail image to GCS.
        Returns the GCS URI (gs://...) — store this in Scene.thumbnail_gcs_uri.
        """
        object_path = self.scene_thumbnail_path(session_id, scene_id)
        await self._upload_bytes(object_path, image_bytes, content_type)
        return self.to_gcs_uri(object_path)

    async def _upload_bytes(self, object_path: str, data: bytes, content_type: str) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, partial(self._sync_upload, object_path, data, content_type)
        )

    def _sync_upload(self, object_path: str, data: bytes, content_type: str) -> None:
        blob = self._bucket.blob(object_path)
        blob.upload_from_string(data, content_type=content_type)

    # ------------------------------------------------------------------
    # Download methods (for fetching reference images)
    # ------------------------------------------------------------------

    async def download_blob_bytes(self, object_path: str) -> bytes:
        """Download a GCS object and return its raw bytes."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, partial(self._sync_download, object_path)
        )

    def _sync_download(self, object_path: str) -> bytes:
        blob = self._bucket.blob(object_path)
        return blob.download_as_bytes()

    # ------------------------------------------------------------------
    # Signed URL generation (sync — cryptographic signing, no network I/O)
    # ------------------------------------------------------------------

    def get_signed_url(
        self,
        object_path: str,
        expiry: timedelta = SIGNED_URL_EXPIRY,
    ) -> str:
        """
        Generate a time-limited signed HTTPS URL for any GCS object.
        Signing uses the service account private key — no extra IAM role required.
        """
        blob = self._bucket.blob(object_path)
        return blob.generate_signed_url(
            expiration=expiry,
            method="GET",
            credentials=self._credentials,
            version="v4",
        )

    def object_path_from_uri(self, gcs_uri: str) -> str:
        """Extract the object path from a gs://bucket/path URI."""
        prefix = f"gs://{self._bucket_name}/"
        if not gcs_uri.startswith(prefix):
            raise ValueError(f"URI {gcs_uri!r} does not belong to bucket {self._bucket_name!r}")
        return gcs_uri[len(prefix):]

    def get_signed_url_from_gcs_uri(
        self,
        gcs_uri: str,
        expiry: timedelta = SIGNED_URL_EXPIRY,
    ) -> str:
        """
        Convenience wrapper: accepts a gs://bucket/path URI and returns a signed URL.
        """
        object_path = self.object_path_from_uri(gcs_uri)
        return self.get_signed_url(object_path, expiry)

    # ------------------------------------------------------------------
    # Storyboard helper — refresh all signed URLs in-place
    # ------------------------------------------------------------------

    def refresh_signed_urls_for_storyboard(self, storyboard: "StoryBoard") -> None:
        """
        Regenerate all signed HTTPS URLs in the storyboard from the stored GCS URIs.
        Mutates storyboard in-place. Call before every GET /api/session/{id} response
        to ensure URLs are never expired.
        Entities without a *_gcs_uri (not yet generated) are skipped.
        """
        if storyboard.thumbnail_gcs_uri:
            storyboard.thumbnail_url = self.get_signed_url_from_gcs_uri(
                storyboard.thumbnail_gcs_uri
            )

        for actor in storyboard.actors:
            if actor.anchor_image_gcs_uri:
                actor.anchor_image_url = self.get_signed_url_from_gcs_uri(
                    actor.anchor_image_gcs_uri
                )

        for theme in storyboard.themes:
            if theme.reference_image_gcs_uri:
                theme.reference_image_url = self.get_signed_url_from_gcs_uri(
                    theme.reference_image_gcs_uri
                )

        for scene in storyboard.scenes:
            if scene.thumbnail_gcs_uri:
                scene.thumbnail_url = self.get_signed_url_from_gcs_uri(scene.thumbnail_gcs_uri)
            for segment in scene.segments:
                if segment.video_gcs_uri:
                    segment.video_url = self.get_signed_url_from_gcs_uri(segment.video_gcs_uri)

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    async def delete_session_assets(self, session_id: str) -> int:
        """
        Delete all GCS objects under sessions/{session_id}/.
        Returns the count of objects deleted.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, partial(self._sync_delete_prefix, f"sessions/{session_id}/")
        )

    def _sync_delete_prefix(self, prefix: str) -> int:
        blobs = list(self._client.list_blobs(self._bucket_name, prefix=prefix))
        if blobs:
            self._bucket.delete_blobs(blobs)
        return len(blobs)

gcs_service = GCSStorageService()
