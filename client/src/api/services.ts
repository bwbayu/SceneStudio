import { apiClient } from "./axios";
import type {
  AddSceneRequest,
  AddSceneResponse,
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
  return data;
}

export async function fetchStoryboard(storyId: string): Promise<StoryBoard> {
  const { data } = await apiClient.get<StoryBoard>(`/storyboards/${storyId}`);
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

// --- Add Scene endpoints ---

export async function startAddScene(
  sessionId: string,
  body: AddSceneRequest
): Promise<AddSceneResponse> {
  const { data } = await apiClient.post<AddSceneResponse>(
    `/pipeline/${sessionId}/scene/add`,
    body
  );
  return data;
}

export async function answerAddSceneQuestions(
  sessionId: string,
  body: { answers: { question: string; selected_options: string[] }[] }
): Promise<AddSceneResponse> {
  const { data } = await apiClient.post<AddSceneResponse>(
    `/pipeline/${sessionId}/scene/answer`,
    body
  );
  return data;
}

export async function fetchAddSceneStatus(
  sessionId: string
): Promise<AddSceneResponse> {
  const { data } = await apiClient.get<AddSceneResponse>(
    `/pipeline/${sessionId}/scene/status`
  );
  return data;
}
