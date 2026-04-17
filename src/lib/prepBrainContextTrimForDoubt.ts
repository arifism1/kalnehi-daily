import type { PrepBrainContext } from "@/lib/prepBrainContext";

const RECENT_TASK_CAP = 18;

/**
 * Small JSON-safe snapshot for doubt voice tagging (sent to `/api/doubt-voice-tag`).
 * Keeps exam profile, weakest chapters, and recent task titles only.
 */
export function trimPrepBrainContextForDoubtTag(
  ctx: PrepBrainContext,
): Record<string, unknown> {
  return {
    exam_profile: ctx.exam_profile,
    syllabus_snapshot: {
      overall_weighted_completion_percent:
        ctx.syllabus_snapshot.overall_weighted_completion_percent,
      weakest_chapters: ctx.syllabus_snapshot.weakest_chapters.slice(0, 10),
    },
    recent_tasks_last_two_weeks: ctx.recent_tasks_last_two_weeks
      .slice(0, RECENT_TASK_CAP)
      .map((t) => ({
        assigned_date: t.assigned_date,
        task_status: t.task_status,
        title: t.title,
      })),
  };
}
