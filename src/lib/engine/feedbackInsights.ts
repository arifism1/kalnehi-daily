import {
  classifyDailyProgressBand,
  computeWeightedCompletionPercent,
  filterTasksForDate,
  findMissedIncompleteTasks,
  PROGRESS_THRESHOLDS,
} from "@/lib/progressEngine";
import type { Microtopic, Task } from "@/store/useTaskStore";

export type FeedbackInsight = {
  title: string;
  body: string;
  tone: "positive" | "neutral" | "urgent";
};

export function buildFeedbackInsights(
  today: string,
  tasks: Task[],
  microtopicById: Record<string, Microtopic>,
  syllabusMasteryPercent: number | null,
): FeedbackInsight[] {
  const out: FeedbackInsight[] = [];
  const todayTasks = filterTasksForDate(tasks, today);
  const todayPct = computeWeightedCompletionPercent(todayTasks, microtopicById);
  const band = classifyDailyProgressBand(todayPct, todayTasks.length);

  const missed = findMissedIncompleteTasks(tasks, today);

  if (syllabusMasteryPercent != null) {
    out.push({
      title: "Syllabus capture",
      body:
        syllabusMasteryPercent >= PROGRESS_THRESHOLDS.PARTIAL_MIN_PERCENT
          ? `You are holding ${syllabusMasteryPercent.toFixed(0)}% of chapter-weight mastery — keep pushing weak chapters to lock full marks.`
          : `Syllabus mastery is ${syllabusMasteryPercent.toFixed(0)}%. Conquer weak chapters before high-stakes mocks — every completed microtopic counts toward the chapter lock-in.`,
      tone:
        syllabusMasteryPercent >= 70
          ? "positive"
          : syllabusMasteryPercent >= 40
            ? "neutral"
            : "urgent",
    });
  }

  if (todayTasks.length > 0) {
    out.push({
      title: "Today’s execution",
      body:
        band === "flawless"
          ? "Flawless day — you completed everything on the plan. Sustain this cadence."
          : band === "strong"
            ? "Strong execution today. Tighten the last few percent to go flawless."
            : band === "mediocre"
              ? "Mediocre execution — you left marks on the table. Tomorrow, protect your first two hours."
              : band === "danger"
                ? "Danger zone today — reclaim discipline: fewer tabs, deeper focus blocks."
                : "No targets locked for today — open Plan and assign high-yield tasks.",
      tone: band === "flawless" || band === "strong" ? "positive" : "urgent",
    });
  }

  if (missed.length > 0) {
    out.push({
      title: "Missed backlog",
      body: `${missed.length} past task${missed.length === 1 ? "" : "s"} still open — reallocate or crush them so marks don’t slip from your rank trajectory.`,
      tone: "urgent",
    });
  }

  if (out.length === 0) {
    out.push({
      title: "Keep the engine warm",
      body: "Add tasks in Plan and track syllabus progress — Kalnehi will surface sharper insights as you execute daily.",
      tone: "neutral",
    });
  }

  return out;
}
