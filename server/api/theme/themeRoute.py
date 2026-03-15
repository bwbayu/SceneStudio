from pathlib import Path
from fastapi import HTTPException, APIRouter
from pydantic import BaseModel

from models import Theme
from api.theme.themeService import generate_and_save_theme_images
from api.firestore.firestoreService import firestore_service

router = APIRouter(
    prefix="/generate",
    tags=["Generate theme image using gemini"],
)


class GenerateImagesRequest(BaseModel):
    session_id: str


@router.post("/theme-images")
async def generate_theme_images(request: GenerateImagesRequest):
    """
    Generate theme images using Gemini Flash Image
    based on theme descriptions from the storyboard.
    """
    # Look up session and storyboard from Firestore
    session_data = await firestore_service.get_session(request.session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    story_id = session_data.get("story_id")
    if not story_id:
        raise HTTPException(status_code=400, detail="Session has no storyboard yet")

    storyboard_data = await firestore_service.get_storyboard(story_id)
    if not storyboard_data:
        raise HTTPException(status_code=404, detail="Storyboard not found")

    themes = [Theme(**t) for t in storyboard_data.get("themes", [])]
    if not themes:
        raise HTTPException(status_code=400, detail="No themes found in storyboard")

    # template_path = Path("template/character_template.png")

    try:
        updated_themes = await generate_and_save_theme_images(
            session_id=request.session_id,
            story_id=story_id,
            themes=themes,
            # template_image_path=template_path if template_path.exists() else None,
        )
        return {
            "message": "Images generated successfully",
            "themes": [a.model_dump() for a in updated_themes],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")
