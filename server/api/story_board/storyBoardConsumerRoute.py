from fastapi import APIRouter, HTTPException

from models import StoryBoard
from api.gcs.GCSService import gcs_service
from api.firestore.firestoreService import firestore_service

router = APIRouter(
    prefix="/storyboards",
    tags=["Storyboard consumer"],
)


@router.get("")
async def list_storyboards():
    """List all ready storyboards for consumers to browse."""
    storyboards = await firestore_service.list_storyboards(status="ready")
    return {"storyboards": storyboards}


@router.get("/{story_id}")
async def get_storyboard(story_id: str):
    """Get a full storyboard with signed URLs for playback."""
    data = await firestore_service.get_storyboard(story_id)
    if not data:
        raise HTTPException(status_code=404, detail="Storyboard not found")

    storyboard = StoryBoard(**data)

    # Regenerate signed URLs from GCS URIs
    gcs_service.refresh_signed_urls_for_storyboard(storyboard)

    return storyboard.model_dump()
