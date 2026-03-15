import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateSceneVideo,
  fetchSceneGenerationStatus,
} from "../api";
import type { GenerateSceneVideoRequest, GenerateSceneVideoResponse } from "../api";

/** Mutation: kick off scene video generation (background job). */
export function useGenerateSceneVideo() {
  return useMutation({
    mutationFn: (body: GenerateSceneVideoRequest) => generateSceneVideo(body),
  });
}

/**
 * Poll scene generation status every 5 seconds.
 * Stops when status is "complete" or "error".
 * On complete, invalidates the storyboard query to refresh video_url.
 * Fires onChange callback when status changes (avoids setState-in-effect).
 */
export function useSceneGenerationStatus(
  sessionId: string | null,
  sceneId: string | null,
  onChange?: (data: GenerateSceneVideoResponse) => void
) {
  const queryClient = useQueryClient();
  const prevStatusRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ["sceneGenerationStatus", sessionId, sceneId],
    queryFn: () =>
      fetchSceneGenerationStatus({
        session_id: sessionId!,
        scene_id: sceneId!,
      }),
    enabled: !!sessionId && !!sceneId,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (status === "complete") {
        queryClient.invalidateQueries({ queryKey: ["storyboard"] });
        return false;
      }
      if (status === "error") return false;
      return 5000;
    },
  });

  // Fire onChange callback when status changes
  useEffect(() => {
    if (query.data && query.data.status !== prevStatusRef.current) {
      prevStatusRef.current = query.data.status;
      onChange?.(query.data);
    }
  }, [query.data, onChange]);

  return query;
}
