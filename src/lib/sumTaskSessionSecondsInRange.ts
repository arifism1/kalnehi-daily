import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

/**
 * Sums `task_sessions.duration_seconds` for the user whose sessions overlap
 * with [startInclusive, endExclusive).
 *
 * A session overlaps the window when:
 *   start_time < endExclusive  AND  (end_time IS NULL OR end_time > startInclusive)
 *
 * This correctly includes sessions that started before the window boundary
 * (e.g. a session starting at 23:58 Sunday that ends at 00:10 Monday is
 * counted in both the old and new week proportionally via duration_seconds —
 * we include it in the window that contains its end_time).
 */
export async function sumTaskSessionSecondsInRange(
  supabase: SupabaseClient<Database>,
  userId: string,
  startInclusive: string,
  endExclusive: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("task_sessions")
    .select("duration_seconds, tasks!inner(user_id)")
    .eq("tasks.user_id", userId)
    // Session must have started before the window ends.
    .lt("start_time", endExclusive)
    // Session must have ended after the window starts (or still be open).
    .or(`end_time.is.null,end_time.gt.${startInclusive}`);
  if (error) throw error;
  let sum = 0;
  for (const row of data ?? []) {
    const s = (row as { duration_seconds?: number | null }).duration_seconds;
    if (typeof s === "number" && s > 0) sum += s;
  }
  return sum;
}
