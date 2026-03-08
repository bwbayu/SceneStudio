import json
import uuid
import os
from pathlib import Path
from google import genai
from models import StoryBoard
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

# Konfigurasi
UPLOAD_DIR = Path("static/character_images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_and_save_actor_images(file_path: Path, template_image_path: Path = None):
    """
    Logika inti untuk membaca JSON, memanggil Gemini 3 Flash Image, 
    dan menyimpan hasilnya ke folder lokal.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"File {file_path} tidak ditemukan")

    with open(file_path, "r") as f:
        data = json.load(f)

    storyboard_data = data.get("storyboard")
    if not storyboard_data:
        raise ValueError("Data storyboard tidak ditemukan dalam JSON")

    storyboard = StoryBoard(**storyboard_data)

    template_img = None
    if template_image_path and template_image_path.exists():
        template_img = Image.open(template_image_path)
    
    reference_instruction = ""
    if template_img:
        reference_instruction = (
            "IMPORTANT: Use the attached image as a style and lighting reference. "
            "Maintain the same color palette, atmospheric mood, and cinematic quality "
            "while generating the specific character described below."
        )
    
    for actor in storyboard.actors:
        if actor.anchor_image_url:
            continue

        prompt_text = (f"""
            {reference_instruction}

            Cinematic character portrait of {actor.name}.
            Physical description: {actor.physical_description}. 
            Outfit: {actor.outfit_description}. 
            style: Cinematic, Gritty Realism, Detailed Textures, Split Screen Studio Reference Sheet.
            Add character name {actor.name} on bottom left image
        """)

        contents = [prompt_text]
        if template_img:
            contents.append(template_img)

        # Menggunakan model Gemini 3 Flash Image (Nano Banana 2)
        response = client.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=contents,
        )

        for part in response.parts:
            if part.inline_data is not None:
                file_name = f"{actor.actor_id}_{uuid.uuid4().hex[:8]}.png"
                local_save_path = UPLOAD_DIR / file_name

                # Menyimpan gambar menggunakan PIL yang terintegrasi di SDK
                image = part.as_image()
                image.save(local_save_path)

                # Update URL relatif untuk akses via static mount
                actor.anchor_image_url = f"/static/character_images/{file_name}"

    # Simpan kembali perubahan ke file JSON
    data["storyboard"] = storyboard.model_dump()
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)
    
    return storyboard.actors