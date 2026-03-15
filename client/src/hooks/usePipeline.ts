import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  startPipeline,
  answerPipelineQuestions,
  fetchPipelineStatus,
} from "../api";
import type {
  StartPipelineRequest,
  AnswerRequest,
  PipelineStatus,
  PipelineStatusResponse,
} from "../api";

const TERMINAL_STATUSES: PipelineStatus[] = ["generation_complete", "storyboard_complete", "error"];

/** Mutation: POST /api/pipeline/start */
export function useStartPipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StartPipelineRequest) => startPipeline(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboards"] });
    },
  });
}

/** Mutation: POST /api/pipeline/{session_id}/answer */
export function useAnswerQuestions() {
  return useMutation({
    mutationFn: ({
      sessionId,
      answers,
    }: {
      sessionId: string;
      answers: AnswerRequest;
    }) => answerPipelineQuestions(sessionId, answers),
  });
}

/**
 * Poll pipeline status every 3 seconds while processing.
 * Stops on terminal states or "clarifying" (needs user input).
 */
export function usePipelineStatus(
  sessionId: string | null,
  onChange?: (data: PipelineStatusResponse) => void
) {
  const prevStatusRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ["pipelineStatus", sessionId],
    queryFn: () => fetchPipelineStatus(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (q) => {
      const status = q.state.data?.status as PipelineStatus | undefined;
      if (!status) return 3000;
      if (TERMINAL_STATUSES.includes(status) || status === "clarifying") {
        return false;
      }
      return 3000;
    },
  });

  // Fire onChange callback when status changes (avoids setState-in-effect lint issue)
  useEffect(() => {
    if (query.data && query.data.status !== prevStatusRef.current) {
      prevStatusRef.current = query.data.status;
      onChange?.(query.data);
    }
  }, [query.data, onChange]);

  return query;
}
