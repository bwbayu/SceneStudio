import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  startAddScene,
  answerAddSceneQuestions,
  fetchAddSceneStatus,
} from "../api";
import type { AddSceneRequest, AddSceneResponse } from "../api";

/** Mutation: POST /api/pipeline/{session_id}/scene/add */
export function useStartAddScene() {
  return useMutation({
    mutationFn: ({
      sessionId,
      body,
    }: {
      sessionId: string;
      body: AddSceneRequest;
    }) => startAddScene(sessionId, body),
  });
}

/** Mutation: POST /api/pipeline/{session_id}/scene/answer */
export function useAnswerAddSceneQuestions() {
  return useMutation({
    mutationFn: ({
      sessionId,
      answers,
    }: {
      sessionId: string;
      answers: { question: string; selected_options: string[] }[];
    }) => answerAddSceneQuestions(sessionId, { answers }),
  });
}

/**
 * Poll add-scene status every 3 seconds while processing.
 * Stops on "complete" or "error".
 * On "complete", invalidates the storyboard query so the new scene appears.
 */
export function useAddSceneStatus(
  sessionId: string | null,
  enabled: boolean,
  storyId: string | null,
  onChange?: (data: AddSceneResponse) => void
) {
  const queryClient = useQueryClient();
  const prevStatusRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ["addSceneStatus", sessionId],
    queryFn: () => fetchAddSceneStatus(sessionId!),
    enabled: !!sessionId && enabled,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status) return 3000;
      if (status === "complete" || status === "error") return false;
      return 3000;
    },
  });

  useEffect(() => {
    if (query.data && query.data.status !== prevStatusRef.current) {
      prevStatusRef.current = query.data.status;
      if (query.data.status === "complete" && storyId) {
        queryClient.invalidateQueries({ queryKey: ["storyboard", storyId] });
      }
      onChange?.(query.data);
    }
  }, [query.data, onChange, storyId, queryClient]);

  return query;
}
