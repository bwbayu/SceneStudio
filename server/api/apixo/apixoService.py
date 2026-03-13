"""
Apixo API service for image and video generation.

Provides async functions for:
- Image generation via Nano Banana 2 (text-to-image and image-to-image)
- Video generation via Veo 3.1 (REFERENCE_2_VIDEO and TEXT_2_VIDEO)
"""

import asyncio
import json
import logging
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

APIXO_BASE_URL = "https://api.apixo.ai/api/v1"
APIXO_IMAGE_MODEL = "nano-banana-2"
APIXO_VIDEO_MODEL = "veo-3-1"
APIXO_API_KEY = os.getenv("APIXO_API_KEY")

# Image polling: 5s initial, 5s interval, 60 iterations (~5min total)
IMAGE_INITIAL_WAIT = 5
IMAGE_POLL_INTERVAL = 5
IMAGE_MAX_ITERATIONS = 60

# Video polling: 60s initial, 15s interval, 40 iterations (~10min total)
VIDEO_INITIAL_WAIT = 60
VIDEO_POLL_INTERVAL = 15
VIDEO_MAX_ITERATIONS = 40


def _auth_headers() -> dict:
    return {
        "Authorization": f"Bearer {APIXO_API_KEY}",
        "Content-Type": "application/json",
    }


async def _submit_task(model: str, payload: dict) -> str:
    """POST to /generateTask/{model} and return the taskId."""
    url = f"{APIXO_BASE_URL}/generateTask/{model}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=_auth_headers(), json=payload)
        resp.raise_for_status()
        body = resp.json()
        task_data = body.get("data")
        if not task_data or not task_data.get("taskId"):
            raise RuntimeError(
                f"Apixo submit failed — unexpected response: {body}"
            )
        task_id = task_data["taskId"]
        logger.info("Submitted Apixo task: model=%s taskId=%s", model, task_id)
        return task_id


async def _poll_task(
    model: str,
    task_id: str,
    initial_wait: int,
    interval: int,
    max_iterations: int,
) -> str:
    """
    Poll /statusTask/{model} until state=="success".
    Returns the first result URL.
    Raises RuntimeError on failure, TimeoutError on timeout.
    """
    url = f"{APIXO_BASE_URL}/statusTask/{model}"
    await asyncio.sleep(initial_wait)

    async with httpx.AsyncClient(timeout=30.0) as client:
        for i in range(max_iterations):
            resp = await client.get(url, headers=_auth_headers(), params={"taskId": task_id})
            resp.raise_for_status()
            body = resp.json()
            data = body.get("data", {})
            state = data.get("state")

            if state == "success":
                result_urls = json.loads(data["resultJson"])["resultUrls"]
                logger.info("Apixo task %s completed: %s", task_id, result_urls[0])
                return result_urls[0]

            if state == "failed":
                fail_msg = data.get("failMsg", "unknown error")
                fail_code = data.get("failCode", "")
                raise RuntimeError(
                    f"Apixo task {task_id} failed: {fail_code} — {fail_msg}"
                )

            logger.debug(
                "Apixo task %s state=%s (poll %d/%d)", task_id, state, i + 1, max_iterations
            )
            await asyncio.sleep(interval)

    raise TimeoutError(
        f"Apixo task {task_id} timed out after {initial_wait + interval * max_iterations}s"
    )


async def _download_bytes(url: str) -> bytes:
    """Download a file from a URL and return raw bytes."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


# ---------------------------------------------------------------------------
# Public image generation
# ---------------------------------------------------------------------------

async def generate_image(
    prompt: str,
    image_urls: list[str] | None = None,
) -> bytes:
    """
    Generate an image via Apixo Nano Banana 2.

    Uses text-to-image if no image_urls provided, image-to-image otherwise.
    Returns JPEG/PNG bytes.
    """
    mode = "image-to-image" if image_urls else "text-to-image"
    payload: dict = {
        "request_type": "async",
        "input": {
            "mode": mode,
            "prompt": prompt,
            "aspect_ratio": "16:9",
            "resolution": "1K",
            "output_format": "jpeg",
        },
    }
    if image_urls:
        payload["input"]["image_urls"] = image_urls

    task_id = await _submit_task(APIXO_IMAGE_MODEL, payload)
    result_url = await _poll_task(
        APIXO_IMAGE_MODEL, task_id,
        IMAGE_INITIAL_WAIT, IMAGE_POLL_INTERVAL, IMAGE_MAX_ITERATIONS,
    )
    return await _download_bytes(result_url)


# ---------------------------------------------------------------------------
# Public video generation
# ---------------------------------------------------------------------------

async def generate_video_reference(
    prompt: str,
    image_urls: list[str],
) -> bytes:
    """
    Generate a video via Apixo Veo 3.1 using REFERENCE_2_VIDEO mode.

    image_urls: public HTTPS URLs (max 3) — actor/theme reference images, or
                [last_frame_url, actor_url, theme_url] for segments 2-3.
    Returns MP4 bytes.
    """
    payload = {
        "request_type": "async",
        "input": {
            "mode": "fast",
            "prompt": prompt,
            "generationType": "REFERENCE_2_VIDEO",
            "aspect_ratio": "16:9",
            "image_urls": image_urls[:3],
        },
    }
    task_id = await _submit_task(APIXO_VIDEO_MODEL, payload)
    result_url = await _poll_task(
        APIXO_VIDEO_MODEL, task_id,
        VIDEO_INITIAL_WAIT, VIDEO_POLL_INTERVAL, VIDEO_MAX_ITERATIONS,
    )
    return await _download_bytes(result_url)


async def generate_video_text(prompt: str) -> bytes:
    """
    Generate a video via Apixo Veo 3.1 using TEXT_2_VIDEO mode.

    Fallback used when no reference images are available.
    Returns MP4 bytes.
    """
    payload = {
        "request_type": "async",
        "input": {
            "mode": "fast",
            "prompt": prompt,
            "generationType": "TEXT_2_VIDEO",
            "aspect_ratio": "16:9",
        },
    }
    task_id = await _submit_task(APIXO_VIDEO_MODEL, payload)
    result_url = await _poll_task(
        APIXO_VIDEO_MODEL, task_id,
        VIDEO_INITIAL_WAIT, VIDEO_POLL_INTERVAL, VIDEO_MAX_ITERATIONS,
    )
    return await _download_bytes(result_url)
