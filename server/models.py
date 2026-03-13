from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# --- Core StoryBoard data models ---

class Choice(BaseModel):
    """A player choice at the end of a scene, linking to a target scene."""
    text: str = Field(description="The choice text shown to the player")
    target_scene_id: str = Field(description="The scene_id this choice leads to")


class AudioDesign(BaseModel):
    """Background music and sound effects design for a video segment."""
    bgm: str = Field(description="Background music mood description, e.g. 'Low suspenseful drone', 'Gentle piano melody'")
    sfx: str = Field(description="Environmental and action sound effects, e.g. 'Rain on roof, thunder rumble', 'Footsteps on gravel'")


class Segment(BaseModel):
    """One ~8-second video segment within a scene."""
    segment_index: int = Field(description="Segment order within the scene: 1, 2, or 3")
    visual_prompt: str = Field(description="Detailed visual prompt for Veo 3.1 video generation")
    camera_movement: str = Field(description="Camera movement instruction, e.g. 'slow push in', 'static wide shot'")
    action_description: str = Field(description="What happens in this ~8-second segment")
    dialogue: list[str] = Field(description="Character dialogue lines, e.g. ['Marcus: Look at these markings.', 'Elena: What markings?']")
    audio: AudioDesign = Field(description="Background music and sound effects design")
    actor_ids: list[str] = Field(default_factory=list, description="Up to 2 actor IDs whose reference images appear in this segment")
    theme_id: Optional[str] = Field(default=None, description="Theme/location ID whose reference image anchors this segment's setting")
    video_gcs_uri: Optional[str] = Field(default=None, description="GCS URI (gs://...) written by Veo; used as extend source for the next segment")
    video_url: Optional[str] = Field(default=None, description="Signed HTTPS URL for frontend video playback; regenerated on each session fetch")


class Scene(BaseModel):
    """A scene made of 3 sequential segments with branching choices."""
    scene_id: str = Field(description="Unique scene identifier, e.g. 'scene_001'")
    title: str = Field(description="Short title for this scene")
    segments: list[Segment] = Field(description="Exactly 3 sequential video segments")
    choices: list[Choice] = Field(description="Player choices at end of scene (empty if is_ending=True)")
    is_ending: bool = Field(default=False, description="True if this is an ending scene")
    thumbnail_gcs_uri: Optional[str] = Field(default=None, description="GCS URI (gs://...) for scene thumbnail; frame extracted from segment 1 video")
    thumbnail_url: Optional[str] = Field(default=None, description="Signed HTTPS URL for frontend display; regenerated on each session fetch")


class Actor(BaseModel):
    """A named character with visual description and reference image links."""
    actor_id: str = Field(description="Unique actor identifier, e.g. 'actor_001'")
    name: str = Field(description="Character name")
    physical_description: str = Field(description="Detailed physical appearance for visual consistency")
    outfit_description: str = Field(description="Clothing and accessories worn in this story")
    anchor_image_gcs_uri: Optional[str] = Field(default=None, description="GCS URI (gs://...) for the actor reference image; used as visual anchor when generating video")
    anchor_image_url: Optional[str] = Field(default=None, description="Signed HTTPS URL for frontend display; regenerated on each session fetch")


class Theme(BaseModel):
    """A key location with atmosphere, lighting, and reference image links."""
    theme_id: str = Field(description="Unique location identifier, e.g. 'theme_001'")
    location_name: str = Field(description="Name of the location")
    atmosphere: str = Field(description="Atmosphere and mood of the location")
    lighting: str = Field(description="Lighting style and conditions")
    reference_image_gcs_uri: Optional[str] = Field(default=None, description="GCS URI (gs://...) for the theme reference image; used as visual anchor when generating video")
    reference_image_url: Optional[str] = Field(default=None, description="Signed HTTPS URL for frontend display; regenerated on each session fetch")


class StoryBoard(BaseModel):
    """The complete assembled storyboard: actors, themes, and scenes."""
    story_id: str
    title: str
    thumbnail_gcs_uri: Optional[str] = None
    thumbnail_url: Optional[str] = None
    actors: list[Actor]
    themes: list[Theme]
    scenes: list[Scene]


# --- Intermediate agent output models ---

class SceneBlueprint(BaseModel):
    """Scene structure produced by the Screenwriter — no video segments yet."""
    scene_id: str = Field(description="Unique scene identifier, e.g. 'scene_001'")
    title: str = Field(description="Short title for this scene")
    summary: str = Field(description="Narrative summary of what happens in this scene")
    choices: list[Choice] = Field(description="Player choices at end of scene (empty if is_ending=True)")
    is_ending: bool = Field(default=False, description="True if this is an ending scene")


# --- Director models ---

class ClarificationQuestion(BaseModel):
    """A structured question with suggested options, like Claude's AskUserQuestion."""
    question: str = Field(description="The question to ask the user")
    options: list[str] = Field(description="2-4 suggested answer options")
    multi_select: bool = Field(default=False, description="True if user can pick multiple options")


class DirectorAnalysis(BaseModel):
    """Production analysis output from the Director agent."""
    title: str = Field(description="Concise, evocative story title (3-6 words)")
    genre: str = Field(description="Film genre, e.g. 'psychological thriller', 'romantic drama'")
    tone: str = Field(description="Overall tone, e.g. 'dark and suspenseful', 'light-hearted'")
    setting: str = Field(description="Primary setting/world of the story")
    key_characters: list[str] = Field(description="Names and brief role descriptions of main characters")
    mood: str = Field(description="Visual and emotional mood to guide production")
    narrative_summary: str = Field(description="2-3 sentence summary of the story arc")


class DirectorOutput(BaseModel):
    """Top-level Director agent response — either questions or a full analysis."""
    status: str = Field(description="'questions' if more info needed, 'ready' if analysis is complete")
    questions: Optional[list[ClarificationQuestion]] = Field(default=None, description="Structured questions with options (only when status='questions')")
    analysis: Optional[DirectorAnalysis] = Field(default=None, description="Complete analysis (only when status='ready')")


# --- Specialist agent output models ---

class ScreenwriterOutput(BaseModel):
    """Screenwriter agent output: list of scene blueprints."""
    scenes: list[SceneBlueprint] = Field(description="5-7 scenes forming the branching narrative")


class CastingOutput(BaseModel):
    """Casting agent output: list of actors with visual descriptions."""
    actors: list[Actor] = Field(description="All named characters with visual descriptions")


class DesignerOutput(BaseModel):
    """Production Designer output: list of themes/locations."""
    themes: list[Theme] = Field(description="All key locations with atmosphere and lighting")


class SegmentEngineerOutput(BaseModel):
    """Segment Engineer output: fully detailed scenes with video segments."""
    scenes: list[Scene] = Field(description="Complete scenes with 3 video segments each")


# --- API session models ---

class QAPair(BaseModel):
    """A single Director question paired with the user's selected answers."""
    question: str
    selected_options: list[str] = Field(description="Options the user selected, or free text as a single-item list")


class SessionState(BaseModel):
    """Server-side in-memory state for an active pipeline session."""
    session_id: str
    creator_id: str = "anonymous"
    script: str
    qa_history: list[QAPair] = []
    status: str = "pending"  # "pending", "clarifying", "processing_agents", "processing_assets", "complete", "error"
    story_id: Optional[str] = None
    storyboard: Optional[StoryBoard] = None
    error: Optional[str] = None


# --- API request/response models ---

class StartRequest(BaseModel):
    """Request body for POST /api/session/start."""
    script: str
    creator_id: str = "anonymous"


class QuestionAnswer(BaseModel):
    """A single answer to one Director question."""
    question: str = Field(description="The question text being answered")
    selected_options: list[str] = Field(description="Chosen option(s), or custom free text as a single-item list")


class AnswerRequest(BaseModel):
    """Request body for POST /api/session/{id}/answer."""
    answers: list[QuestionAnswer]


class SessionResponse(BaseModel):
    """API response returned at every session endpoint."""
    session_id: str
    status: str  # "questions", "processing", "complete", "error"
    questions: Optional[list[ClarificationQuestion]] = None
    storyboard: Optional[StoryBoard] = None
    error: Optional[str] = None


class PipelineStatusResponse(BaseModel):
    """Lightweight status response for the full generation pipeline polling endpoint."""
    session_id: str
    story_id: Optional[str] = None
    # pending | clarifying | processing_agents | processing_assets
    # | generating_images | generating_videos | generation_complete | error
    status: str
    questions: Optional[list[ClarificationQuestion]] = None
    error: Optional[str] = None
