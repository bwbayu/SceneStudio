import asyncio
import os
from pathlib import Path
from typing import Optional

from google import genai
from dotenv import load_dotenv
from PIL import Image

from models import Theme
from api.gcs.GCSService import gcs_service
from api.firestore.firestoreService import firestore_service

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


async def generate_and_save_theme_images(
    session_id: str,
    story_id: str,
    themes: list[Theme],
    template_image_path: Optional[Path] = None,
) -> list[Theme]:
    """
    Generate theme reference images using Gemini Flash Image,
    upload to GCS, and update Firestore with GCS URIs.
    """
    template_img = None
    if template_image_path and template_image_path.exists():
        template_img = Image.open(template_image_path)

    reference_instruction = ""
    if template_img:
        reference_instruction = (
            "IMPORTANT: Use the attached image as a visual reference for overall style, "
            "color grading, and cinematic texture. The new image should feel like it "
            "belongs in the same movie world."
        )

    async def process_theme(theme: Theme) -> None:
        prompt_text = f"""
            {reference_instruction}
            
            Cinematic environment concept art for: {theme.location_name}.
            Atmosphere: {theme.atmosphere}. 
            Lighting: {theme.lighting}.
            Visual Style: 4K resolution, Hyper-realistic, Highly detailed, wide shot, no people.
        """

        contents = [prompt_text]
        if template_img:
            contents.append(template_img)

        response = await client.aio.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=contents,
        )

        for part in response.parts:
            if part.inline_data is not None:
                image_bytes = part.inline_data.data
                content_type = part.inline_data.mime_type or "image/png"

                # Upload to GCS
                gcs_uri = await gcs_service.upload_theme_image(
                    session_id=session_id,
                    theme_id=theme.theme_id,
                    image_bytes=image_bytes,
                    content_type=content_type,
                )

                # Update in-memory model
                theme.reference_image_gcs_uri = gcs_uri

                # Persist GCS URI to Firestore
                await firestore_service.update_theme_image(
                    story_id=story_id,
                    theme_id=theme.theme_id,
                    gcs_uri=gcs_uri,
                )
                break  # Only need the first image part

    await asyncio.gather(*[process_theme(theme) for theme in themes])

    return themes
