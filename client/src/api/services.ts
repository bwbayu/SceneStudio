import { apiClient } from "./axios";
import type {
  AnswerRequest,
  GenerateSceneVideoRequest,
  GenerateSceneVideoResponse,
  PipelineStatusResponse,
  SceneStatusRequest,
  SessionResponse,
  StartPipelineRequest,
  StoryBoard,
  StoryboardListResponse,
} from "./types";

// --- Storyboard consumer endpoints ---

export async function fetchStoryboards(): Promise<StoryboardListResponse> {
  const { data } = await apiClient.get<StoryboardListResponse>("/storyboards");
  console.log("FETCH ALL STORYBOARD", data)
  return data;
}

export async function fetchStoryboard(storyId: string): Promise<StoryBoard> {
  const { data } = await apiClient.get<StoryBoard>(`/storyboards/${storyId}`);
  console.log("FETCH STORYBOARD PER STORY ID", data)
  return data;
}

// --- Pipeline endpoints ---

export async function startPipeline(
  body: StartPipelineRequest
): Promise<SessionResponse> {
  const { data } = await apiClient.post<SessionResponse>(
    "/pipeline/start",
    body
  );
  return data;
}

export async function answerPipelineQuestions(
  sessionId: string,
  body: AnswerRequest
): Promise<SessionResponse> {
  const { data } = await apiClient.post<SessionResponse>(
    `/pipeline/${sessionId}/answer`,
    body
  );
  return data;
}

export async function fetchPipelineStatus(
  sessionId: string
): Promise<PipelineStatusResponse> {
  const { data } = await apiClient.get<PipelineStatusResponse>(
    `/pipeline/status/${sessionId}`
  );
  return data;
}

// --- Scene video generation endpoints ---

export async function generateSceneVideo(
  body: GenerateSceneVideoRequest
): Promise<GenerateSceneVideoResponse> {
  const { data } = await apiClient.post<GenerateSceneVideoResponse>(
    "/scene/generate-video",
    body
  );
  return data;
}

export async function fetchSceneGenerationStatus(
  body: SceneStatusRequest
): Promise<GenerateSceneVideoResponse> {
  const { data } = await apiClient.post<GenerateSceneVideoResponse>(
    "/scene/generate-video/status",
    body
  );
  return data;
}
