"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { getIstWeekBounds } from "@/lib/istWeek";
import { cohortAspirantLabel } from "@/lib/leaderboardCopy";
import { USER_ERROR } from "@/lib/userFacingErrors";

const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export type AnonymousLeaderboardLine = {
  topPercent: number | null;
  cohortSize: number;
  examGroupLabel: string;
  weekStart: string;
  stale: boolean;
  hasSnapshot: boolean;
};

export async function getAnonymousLeaderboardLine(): Promise<
  | { ok: true; data: AnonymousLeaderboardLine }
  | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }

    const { weekStartDate } = getIstWeekBounds();
    const admin = getSupabaseServiceRoleClient();
    if (!admin) {
      return { ok: false, error: "Service unavailable." };
    }

    const { data: row, error: rowErr } = await admin
      .from("leaderboard_weekly_metrics")
      .select(
        "top_percent, cohort_size, cohort_key, updated_at, weekly_seconds, syllabus_overall_pct",
      )
      .eq("user_id", user.id)
      .eq("week_start", weekStartDate)
      .maybeSingle();

    if (rowErr) {
      return { ok: false, error: "Failed to load leaderboard." };
    }

    // Derive the exam label from the snapshot's cohort_key rather than a live
    // user_profiles join. This prevents the label and percentile from disagreeing
    // when the user changes their exam between cron runs.
    // Derive label from the snapshot's cohort_key, not a live user_profiles join,
    // so the label and percentile always come from the same cron-run cohort.
    const examGroupLabel = row?.cohort_key
      ? cohortAspirantLabel(row.cohort_key)
      : "students";

    const updatedAt = row?.updated_at ? new Date(row.updated_at).getTime() : 0;
    const stale = !updatedAt || Date.now() - updatedAt > STALE_AFTER_MS;

    return {
      ok: true,
      data: {
        topPercent: row?.top_percent ?? null,
        cohortSize: row?.cohort_size ?? 0,
        examGroupLabel,
        weekStart: weekStartDate,
        stale,
        hasSnapshot: row != null,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
