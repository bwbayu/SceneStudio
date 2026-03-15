// --- Core domain models (matches server/models.py) ---

export interface Choice {
  text: string;
  target_scene_id: string;
}

export interface AudioDesign {
  bgm: string;
  sfx: string;
}

export interface Segment {
  segment_index: number;
  visual_prompt: string;
  camera_movement: string;
  action_description: string;
  dialogue: string[];
  audio: AudioDesign;
  actor_ids: string[];
  theme_id: string | null;
  video_gcs_uri: string | null;
  video_url: string | null;
}

export interface Scene {
  scene_id: string;
  title: string;
  segments: Segment[];
  choices: Choice[];
  is_ending: boolean;
  thumbnail_gcs_uri: string | null;
  thumbnail_url: string | null;
  video_gcs_uri: string | null;
  video_url: string | null;
}

export interface Actor {
  actor_id: string;
  name: string;
  physical_description: string;
  outfit_description: string;
  anchor_image_gcs_uri: string | null;
  anchor_image_url: string | null;
}

export interface Theme {
  theme_id: string;
  location_name: string;
  atmosphere: string;
  lighting: string;
  reference_image_gcs_uri: string | null;
  reference_image_url: string | null;
}

export interface StoryBoard {
  story_id: string;
  session_id: string;
  title: string;
  thumbnail_gcs_uri: string | null;
  thumbnail_url: string | null;
  actors: Actor[];
  themes: Theme[];
  scenes: Scene[];
}

// --- Clarification / Pipeline models ---

export interface ClarificationQuestion {
  question: string;
  options: string[];
  multi_select: boolean;
}

export interface QuestionAnswer {
  question: string;
  selected_options: string[];
}

// --- API request bodies ---

export interface StartPipelineRequest {
  script: string;
  creator_id?: string;
}

export interface AnswerRequest {
  answers: QuestionAnswer[];
}

export interface GenerateSceneVideoRequest {
  session_id: string;
  scene_id: string;
  provider?: "apixo" | "gemini";
}

export interface SceneStatusRequest {
  session_id: string;
  scene_id: string;
}

// --- API response bodies ---

export interface SessionResponse {
  session_id: string;
  status: string;
  questions: ClarificationQuestion[] | null;
  storyboard: StoryBoard | null;
  error: string | null;
}

export interface PipelineStatusResponse {
  session_id: string;
  story_id: string | null;
  status: PipelineStatus;
  questions: ClarificationQuestion[] | null;
  error: string | null;
}

export interface GenerateSceneVideoResponse {
  status: string;
  message: string;
  scene_id: string;
}

export interface StoryboardListItem {
  story_id: string;
  session_id: string;
  title: string;
  creator_id: string;
  status: string;
  created_at: string;
  thumbnail_url: string | null;
}

export interface StoryboardListResponse {
  storyboards: StoryboardListItem[];
}

// --- Add Scene models ---

export interface AddSceneRequest {
  scene_description: string;
  actor_ids: string[];
  theme_id: string | null;
  prev_scene_ids: string[];
  next_scene_ids: string[];
}

export interface AddSceneResponse {
  status: string; // "questions" | "processing" | "complete" | "error"
  questions: ClarificationQuestion[] | null;
  scene_id: string | null;
  error: string | null;
}

// --- Pipeline status union ---

export type PipelineStatus =
  | "pending"
  | "clarifying"
  | "processing_agents"
  | "processing_assets"
  | "generating_images"
  | "generating_videos"
  | "generation_complete"
  | "storyboard_complete"
  | "error";
