"use client";

import { insertDailyTask } from "@/actions/dailyPlan";
import { slotFromStartEnd, timeDbToInput } from "@/lib/dailyPlanTime";
import { resolveMicrotopicForTask } from "@/lib/resolveMicrotopicForTask";
import type { Microtopic, Task } from "@/store/useTaskStore";

function buildDailyPlanTitle(
  t: Task,
  syllabusById: Record<string, Microtopic>,
): string {
  const name = (t.name ?? "").trim();
  if (name) return name.slice(0, 500);
  const m = resolveMicrotopicForTask(t, syllabusById);
  const label = (m.microtopic || m.chapter || m.subject || "").trim();
  if (label) return label.slice(0, 500);
  return "Planned task";
}

/**
 * Ensures a rescheduled academic `tasks` row appears on the unified Daily Plan
 * (`daily_plans` / `daily_tasks`) for the given date. The planner and Today's Plan
 * are separate stores; date-only updates would otherwise be invisible on /daily-plan.
 */
export async function addAcademicTaskToUnifiedDailyPlan(
  t: Task,
  planDate: string,
  syllabusById: Record<string, Microtopic>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const startInput = t.start_time ? timeDbToInput(t.start_time) : "";
  const endInput = t.end_time ? timeDbToInput(t.end_time) : "";
  const { time_slot, time_start, time_end } = slotFromStartEnd(
    startInput,
    endInput,
  );
  const title = buildDailyPlanTitle(t, syllabusById);
  const status = t.status === "completed" ? "done" : "pending";

  const res = await insertDailyTask({
    plan_date: planDate,
    id: crypto.randomUUID(),
    title,
    time_slot,
    time_start,
    time_end,
    priority: "normal",
    status,
    source: "moved",
    source_raw_text: null,
    syllabus_master_id: t.microtopic_id?.trim() || null,
  });
  if (!res.ok) return res;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
  }
  return { ok: true };
}
