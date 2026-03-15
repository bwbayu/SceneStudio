import { useQuery } from "@tanstack/react-query";
import { fetchStoryboards, fetchStoryboard } from "../api";
import type { StoryboardListItem } from "../api";

/** Fetch all storyboards for the dashboard. */
export function useStoryboards() {
  return useQuery({
    queryKey: ["storyboards"],
    queryFn: fetchStoryboards,
    select: (data) => data.storyboards,
  });
}

/** Fetch a single full storyboard by story_id (for SceneEditor). */
export function useStoryboard(storyId: string | null) {
  return useQuery({
    queryKey: ["storyboard", storyId],
    queryFn: () => fetchStoryboard(storyId!),
    enabled: !!storyId,
  });
}

/** Derived dashboard analytics computed from the storyboard list. */
export function useDashboardStats(storyboards: StoryboardListItem[] | undefined) {
  const total = storyboards?.length ?? 0;
  const published = storyboards?.filter((s) => s.status === "ready").length ?? 0;
  return { total, published };
}
