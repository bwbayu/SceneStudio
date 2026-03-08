from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# --- Core StoryBoard data models ---

class Choice(BaseModel):
    text: str = Field(description="The choice text shown to the player")
    target_scene_id: str = Field(description="The scene_id this choice leads to")


class AudioDesign(BaseModel):
    bgm: str = Field(description="Background music mood description, e.g. 'Low suspenseful drone', 'Gentle piano melody'")
    sfx: str = Field(description="Environmental and action sound effects, e.g. 'Rain on roof, thunder rumble', 'Footsteps on gravel'")


class Segment(BaseModel):
    segment_index: int = Field(description="Segment order within the scene: 1, 2, or 3")
    visual_prompt: str = Field(description="Detailed visual prompt for Veo 3.1 video generation")
    camera_movement: str = Field(description="Camera movement instruction, e.g. 'slow push in', 'static wide shot'")
    action_description: str = Field(description="What happens in this ~8-second segment")
    dialogue: list[str] = Field(description="Character dialogue lines, e.g. ['Marcus: Look at these markings.', 'Elena: What markings?']")
    audio: AudioDesign = Field(description="Background music and sound effects design")


class Scene(BaseModel):
    scene_id: str = Field(description="Unique scene identifier, e.g. 'scene_001'")
    title: str = Field(description="Short title for this scene")
    segments: list[Segment] = Field(description="Exactly 3 sequential video segments")
    choices: list[Choice] = Field(description="Player choices at end of scene (empty if is_ending=True)")
    is_ending: bool = Field(default=False, description="True if this is an ending scene")


class Actor(BaseModel):
    actor_id: str = Field(description="Unique actor identifier, e.g. 'actor_001'")
    name: str = Field(description="Character name")
    physical_description: str = Field(description="Detailed physical appearance for visual consistency")
    outfit_description: str = Field(description="Clothing and accessories worn in this story")
    anchor_image_url: Optional[str] = Field(default=None, description="Reference image URL (generated later)")


class Theme(BaseModel):
    theme_id: str = Field(description="Unique location identifier, e.g. 'theme_001'")
    location_name: str = Field(description="Name of the location")
    atmosphere: str = Field(description="Atmosphere and mood of the location")
    lighting: str = Field(description="Lighting style and conditions")
    reference_image_url: Optional[str] = Field(default=None, description="Reference image URL (generated later)")


class StoryBoard(BaseModel):
    story_id: str
    title: str
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
    genre: str = Field(description="Film genre, e.g. 'psychological thriller', 'romantic drama'")
    tone: str = Field(description="Overall tone, e.g. 'dark and suspenseful', 'light-hearted'")
    setting: str = Field(description="Primary setting/world of the story")
    key_characters: list[str] = Field(description="Names and brief role descriptions of main characters")
    mood: str = Field(description="Visual and emotional mood to guide production")
    narrative_summary: str = Field(description="2-3 sentence summary of the story arc")


class DirectorOutput(BaseModel):
    status: str = Field(description="'questions' if more info needed, 'ready' if analysis is complete")
    questions: Optional[list[ClarificationQuestion]] = Field(default=None, description="Structured questions with options (only when status='questions')")
    analysis: Optional[DirectorAnalysis] = Field(default=None, description="Complete analysis (only when status='ready')")


# --- Specialist agent output models ---

class ScreenwriterOutput(BaseModel):
    scenes: list[SceneBlueprint] = Field(description="5-7 scenes forming the branching narrative")


class CastingOutput(BaseModel):
    actors: list[Actor] = Field(description="All named characters with visual descriptions")


class DesignerOutput(BaseModel):
    themes: list[Theme] = Field(description="All key locations with atmosphere and lighting")


class SegmentEngineerOutput(BaseModel):
    scenes: list[Scene] = Field(description="Complete scenes with 3 video segments each")


# --- API session models ---

class QAPair(BaseModel):
    question: str
    selected_options: list[str] = Field(description="Options the user selected, or free text as a single-item list")


class SessionState(BaseModel):
    session_id: str
    script: str
    qa_history: list[QAPair] = []
    status: str = "pending"  # "pending", "clarifying", "processing", "complete", "error"
    storyboard: Optional[StoryBoard] = None
    error: Optional[str] = None


# --- API request/response models ---

class StartRequest(BaseModel):
    script: str


class QuestionAnswer(BaseModel):
    question: str = Field(description="The question text being answered")
    selected_options: list[str] = Field(description="Chosen option(s), or custom free text as a single-item list")


class AnswerRequest(BaseModel):
    answers: list[QuestionAnswer]


class SessionResponse(BaseModel):
    session_id: str
    status: str  # "questions", "processing", "complete", "error"
    questions: Optional[list[ClarificationQuestion]] = None
    storyboard: Optional[StoryBoard] = None
    error: Optional[str] = None
