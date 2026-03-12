"""
Scene video generation service using Veo 3.1.

Generates 3 sequential video segments per scene:
  - Segment 1: Text-to-video with actor/theme reference images
  - Segment 2: Extend from Segment 1 + reference images
  - Segment 3: Extend from Segment 2 + reference images

All videos are landscape (16:9), 720p resolution.
"""

import asyncio
import logging
import os
import time

from google import genai
from google.genai import types
from dotenv import load_dotenv

from models import Scene, Segment, Actor, Theme
from api.gcs.GCSService import gcs_service
from api.firestore.firestoreService import firestore_service

load_dotenv()

logger = logging.getLogger(__name__)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

VEO_MODEL = "veo-3.1-fast-generate-preview"
MAX_POLL_ITERATIONS = 180  # 18 minutes
POLL_INTERVAL_SECONDS = 10


async def _build_reference_images(
    segment: Segment,
    actors: list[Actor],
    themes: list[Theme],
) -> list[types.VideoGenerationReferenceImage]:
    """
    Download actor/theme images from GCS and wrap them as Veo reference images.
    Returns up to 3 references (max 2 actors + 1 theme).
    """
    references: list[types.VideoGenerationReferenceImage] = []

    # Actors (up to 2)
    for actor_id in segment.actor_ids[:2]:
        actor = next((a for a in actors if a.actor_id == actor_id), None)
        if actor and actor.anchor_image_gcs_uri:
            obj_path = gcs_service.object_path_from_uri(actor.anchor_image_gcs_uri)
            image_bytes = await gcs_service.download_blob_bytes(obj_path)
            image = types.Image(image_bytes=image_bytes, mime_type="image/jpeg")
            references.append(types.VideoGenerationReferenceImage(
                image=image,
                reference_type="asset",
            ))

    # Theme (max 1)
    if segment.theme_id:
        theme = next((t for t in themes if t.theme_id == segment.theme_id), None)
        if theme and theme.reference_image_gcs_uri:
            obj_path = gcs_service.object_path_from_uri(theme.reference_image_gcs_uri)
            image_bytes = await gcs_service.download_blob_bytes(obj_path)
            image = types.Image(image_bytes=image_bytes, mime_type="image/jpeg")
            references.append(types.VideoGenerationReferenceImage(
                image=image,
                reference_type="asset",
            ))

    return references


async def _poll_operation(operation):
    """Poll a Veo operation until done. Runs blocking poll in executor."""
    loop = asyncio.get_running_loop()

    def _sync_poll(op):
        polls = 0
        while not op.done:
            if polls >= MAX_POLL_ITERATIONS:
                raise TimeoutError(
                    f"Veo operation timed out after {MAX_POLL_ITERATIONS * POLL_INTERVAL_SECONDS}s"
                )
            time.sleep(POLL_INTERVAL_SECONDS)
            op = client.operations.get(op)
            polls += 1
        return op

    return await loop.run_in_executor(None, _sync_poll, operation)


async def _upload_segment_video(
    session_id: str, scene_id: str, segment_index: int, video_bytes: bytes
) -> str:
    """Upload generated video bytes to GCS and return the gs:// URI."""
    object_path = (
        gcs_service.segment_output_prefix(session_id, scene_id, segment_index)
        + "video.mp4"
    )
    await gcs_service._upload_bytes(object_path, video_bytes, "video/mp4")
    return gcs_service.to_gcs_uri(object_path)


async def generate_scene_videos(
    session_id: str,
    story_id: str,
    scene: Scene,
    actors: list[Actor],
    themes: list[Theme],
) -> None:
    """
    Generate videos for all 3 segments of a scene sequentially.

    Segment 1: text-to-video with reference images.
    Segments 2-3: extend from previous segment's video + reference images.
    Persists each video_gcs_uri to Firestore after generation.
    """
    previous_video = None

    for segment in sorted(scene.segments, key=lambda s: s.segment_index):
        logger.info(
            "Generating segment %d of scene %s...",
            segment.segment_index, scene.scene_id,
        )

        reference_images = await _build_reference_images(segment, actors, themes)
        logger.info(
            "Segment %d references: actor_ids=%s theme_id=%s total=%d",
            segment.segment_index, segment.actor_ids, segment.theme_id, len(reference_images),
        )

        if segment.segment_index == 1:
            # Text-to-video (first segment)
            config = types.GenerateVideosConfig(
                aspect_ratio="16:9",
                resolution="720p",
                number_of_videos=1,
                reference_images=reference_images if reference_images else None,
            )
            operation = client.models.generate_videos(
                model=VEO_MODEL,
                prompt=segment.visual_prompt,
                config=config,
            )
        else:
            # Extend from previous segment's video
            if previous_video is None:
                raise RuntimeError(
                    f"Cannot extend segment {segment.segment_index}: "
                    f"previous segment has no generated video"
                )

            config = types.GenerateVideosConfig(
                aspect_ratio="16:9",
                resolution="720p",
                number_of_videos=1,
                reference_images=reference_images if reference_images else None,
            )
            operation = client.models.generate_videos(
                model=VEO_MODEL,
                video=previous_video,
                prompt=segment.visual_prompt,
                config=config,
            )

        # Poll until done
        operation = await _poll_operation(operation)

        if not operation.response or not operation.response.generated_videos:
            rai_count = (
                getattr(operation.response, "rai_media_filtered_count", None)
                if operation.response else None
            )
            rai_reasons = (
                getattr(operation.response, "rai_media_filtered_reasons", None)
                if operation.response else None
            )
            logger.error(
                "Veo returned no video for segment %d — rai_filtered=%s reasons=%s",
                segment.segment_index, rai_count, rai_reasons,
            )
            reason = f" (RAI filtered: {rai_count}, reasons: {rai_reasons})" if rai_count else ""
            raise RuntimeError(
                f"Veo returned no video for segment {segment.segment_index}{reason}"
            )

        # Download video bytes from Veo server
        generated_video = operation.response.generated_videos[0]
        client.files.download(file=generated_video.video)
        video_bytes = generated_video.video.video_bytes

        # Upload to our GCS bucket
        gcs_uri = await _upload_segment_video(
            session_id, scene.scene_id, segment.segment_index, video_bytes
        )

        # Persist to Firestore
        await firestore_service.update_segment_video(
            story_id=story_id,
            scene_id=scene.scene_id,
            segment_index=segment.segment_index,
            gcs_uri=gcs_uri,
        )

        # Keep video reference for next segment's extension
        previous_video = generated_video.video

        logger.info(
            "Segment %d of scene %s generated: %s",
            segment.segment_index, scene.scene_id, gcs_uri,
        )
