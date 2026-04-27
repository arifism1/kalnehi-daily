"use client";

import { insertDailyTask } from "@/actions/dailyPlan";
import type { RevisionQueueEntry } from "@/lib/userPlannerTextTypes";

/**
 * Mirrors addAcademicTaskToUnifiedDailyPlan for revision-reminder rows.
 *
 * Called after plannerTextSetRevisionReminderNextDue succeeds so the revision
 * entry is always updated before this insert — if the insert fails the user
 * still has the correct nextDue date in their revision queue for today.
 */
export async function addRevisionReminderToUnifiedDailyPlan(
  item: RevisionQueueEntry,
  planDate: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const title = item.title.trim().slice(0, 500) || "Revision";

  const res = await insertDailyTask({
    plan_date: planDate,
    id: crypto.randomUUID(),
    title,
    source: "revision",
    status: "pending",
    syllabus_master_id: item.microtopicId?.trim() || null,
  });

  if (!res.ok) return res;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
  }
  return { ok: true };
}
