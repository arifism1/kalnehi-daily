import { format, parseISO, subDays } from "date-fns";

import type { CuetScoringRollup, NeetYearProjection, SyllabusRollup } from "@/lib/syllabusRollup";
import {
  classifyDailyProgressBand,
  computeDaysBehindExecution,
  computeWeightedCompletionPercent,
  DAILY_PROGRESS_HEADLINE,
  DAILY_PROGRESS_PILL,
  filterTasksForDate,
  filterTasksThroughDate,
  findMissedIncompleteTasks,
  resolveTaskMarksWeight,
  sumEstimatedMinutes,
  sumPlannedMarksWeight,
  type DailyProgressBand,
} from "@/lib/progressEngine";
import type { ExecutionSessionRow } from "@/lib/taskIdb";
import type { StudySessionLog } from "@/lib/studySessionTypes";
import type { Microtopic, Task } from "@/store/useTaskStore";
import type { HabitBundle } from "@/lib/habitLocal";

const WEAK_CHAPTER_CAP = 10;
const RECENT_TASK_CAP = 40;

/** Avoid `[...value]` — non-arrays (e.g. `{}`, numbers) throw at runtime after odd JSON/client payloads. */
function safeArraySlice<T>(value: unknown, max: number): T[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max) as T[];
}

/**
 * LLM-facing snapshot: keys and labels are written for plain-English coaching,
 * not internal API / column names.
 */
export type PrepBrainContext = {
  context_generated_at: string;
  calendar_date_today: string;
  exam_profile: {
    exam_label: string | null;
    exam_display_name: string;
    target_exam_date: string | null;
    max_score_scale: number | null;
    primary_marks_year: number | null;
  };
  syllabus_snapshot: {
    overall_weighted_completion_percent: number;
    total_marks_secured_in_syllabus_model: number;
    total_marks_pool_in_syllabus_model: number;
    weakest_chapters: Array<{
      subject: string;
      chapter: string;
      percent_of_microtopics_done_in_chapter: number;
      chapter_weight_in_marks: number;
      chapter_fully_mastered: boolean;
    }>;
    neet_style_projections_by_year: Array<{
      exam_year: number;
      projected_score_on_720_scale: number;
      pattern_label: string;
      completion_note: string;
    }>;
    cuet_domain_summary: null | {
      overall_percent_across_domains: number;
      total_projected_marks: number;
      total_max_marks: number;
      per_domain: Array<{
        subject: string;
        microtopics_completed: number;
        microtopics_total: number;
        completion_percent: number;
        projected_marks: number;
        max_marks_per_domain: number;
      }>;
    };
  };
  todays_planned_work: {
    completion_percent_for_todays_planned_tasks: number;
    todays_execution_status_label: string;
    todays_execution_guidance_line: string;
    planned_marks_weight_total_for_today: number;
    estimated_minutes_planned_for_today: number;
    /** Open academic `tasks` with assigned_date &lt; today. Omitted in older client payloads. */
    count_of_incomplete_academic_tasks_from_past_days?: number;
    /** Open unified `daily_tasks` with plan date &lt; today (not done). Omitted in older client payloads. */
    count_of_incomplete_unified_plan_tasks_from_past_days?: number;
    /** Sum of academic + unified incomplete carry-over; legacy payloads only had this field. */
    count_of_incomplete_tasks_from_past_days: number;
    days_behind_on_execution: number | null;
  };
  recent_tasks_last_two_weeks: Array<{
    assigned_date: string;
    task_status: string;
    title: string;
    marks_weight: number;
    estimated_minutes: number;
  }>;
  last_7_days: {
    execution_timer_sessions: {
      session_count: number;
      total_minutes: number;
    };
    study_sessions_with_camera: {
      session_count: number;
      total_minutes: number;
      sessions_marked_camera_proven: number;
    };
  };
  habits_overview: {
    habit_names: string[];
    completed_habit_logs_last_14_days: number;
  };
  meditation_last_30_days: {
    session_count: number;
    distinct_days_with_a_session: number;
  };
  /**
   * When the user is enrolled in more than one exam, this lists a lightweight
   * rollup for every non-primary exam so the AI can give multi-exam coaching.
   * Absent for single-exam users (older context payloads).
   */
  all_enrolled_exams?: Array<{
    exam_label: string;
    exam_display_name: string;
    overall_weighted_completion_percent: number;
    total_marks_secured: number;
    total_marks_pool: number;
    max_score_scale: number;
    subject_summaries: Array<{
      subject: string;
      completion_percent: number;
      marks_secured: number;
      marks_pool: number;
    }>;
  }>;
};

export type PrepBrainCompactContext = {
  context_generated_at: string;
  exam: {
    label: string;
    target_exam_date: string | null;
  };
  syllabus: {
    completion_percent: number;
    marks_secured: number;
    marks_total: number;
  };
  subjects: {
    weak_top_3: Array<{ subject: string; completion_percent: number }>;
    strong_top_3: Array<{ subject: string; completion_percent: number }>;
  };
  today_plan: {
    completion_percent: number;
    execution_status: string;
    days_behind: number | null;
    /** Daily-plan tasks from before today that are still incomplete (not the old Pending page). */
    incomplete_tasks_from_past_days: number;
  };
  consistency: {
    execution_sessions_last_7d: number;
    study_sessions_last_7d: number;
    camera_proven_sessions_last_7d: number;
    completed_habit_logs_last_14d: number;
    meditation_days_last_30d: number;
    meditation_sessions_last_30d: number;
  };
  key_insights: string[];
};

export type PrepBrainContextInput = {
  nowIso: string;
  calendarToday: string;
  examLabel: string | null;
  examDisplayName: string;
  targetExamDate: string | null;
  maxScore: number | null;
  primaryMarksYear: number | null;
  rollup: SyllabusRollup | null;
  neetYearProjections: NeetYearProjection[];
  cuetScoringRollup: CuetScoringRollup | null;
  tasks: Task[];
  microtopicById: Record<string, Microtopic>;
  executionSessions: ExecutionSessionRow[];
  studySessions: StudySessionLog[];
  habitBundle: HabitBundle | null;
  meditation30d: { sessionCount: number; distinctDays: number };
  /**
   * UPSC CSE Mains: align LLM snapshot with fixed 2350 UI denominator and % on that scale.
   */
  syllabus_snapshot_overrides?: {
    overall_weighted_completion_percent: number;
    total_marks_pool_in_syllabus_model: number;
  } | null;
  /**
   * When `totalCount &gt; 0`, today’s execution % / band follow unified daily plan
   * (same as home / consistency). Omitted in older snapshots — treat as no overlay.
   */
  dailyPlanToday?: { totalCount: number; doneCount: number; percent: number } | null;
  /** Past-due `daily_tasks` (not done). Defaults to 0 if omitted. */
  incompleteDailyTasksFromPastDays?: number;
  /**
   * Calendar lag from `computeDaysBehindExecution`-style logic on unified plans.
   * Merged with academic days behind via max when both exist.
   */
  dailyPlanExecutionLagDays?: number | null;
};

function taskTitle(task: Task, microtopicById: Record<string, Microtopic>): string {
  const n = task.name?.trim();
  if (n) return n.slice(0, 200);
  if (task.microtopic_id) {
    const m = microtopicById[task.microtopic_id];
    if (m) {
      const piece = [m.subject, m.chapter, m.microtopic].filter(Boolean).join(" · ");
      return piece.slice(0, 200) || "Task";
    }
  }
  return "Task";
}

function msInLastDays(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const cutoff = Date.now() - days * 86_400_000;
  return t >= cutoff;
}

function weakChaptersFromRollup(rollup: SyllabusRollup | null): PrepBrainContext["syllabus_snapshot"]["weakest_chapters"] {
  if (!rollup?.chapters?.length) return [];
  return [...rollup.chapters]
    .sort((a, b) => a.microtopicProgressPercent - b.microtopicProgressPercent)
    .slice(0, WEAK_CHAPTER_CAP)
    .map((ch) => ({
      subject: ch.subject,
      chapter: ch.chapter,
      percent_of_microtopics_done_in_chapter: ch.microtopicProgressPercent,
      chapter_weight_in_marks: ch.chapterMarksTotal,
      chapter_fully_mastered: ch.isChapterMastered,
    }));
}

function bandCopy(band: DailyProgressBand): { label: string; guidance: string } {
  return {
    label: DAILY_PROGRESS_PILL[band],
    guidance: DAILY_PROGRESS_HEADLINE[band],
  };
}

function mapCuet(c: CuetScoringRollup): NonNullable<PrepBrainContext["syllabus_snapshot"]["cuet_domain_summary"]> {
  return {
    overall_percent_across_domains: c.overallPercent,
    total_projected_marks: c.totalProjected,
    total_max_marks: c.totalMax,
    per_domain: c.subjects.map((s) => ({
      subject: s.subject,
      microtopics_completed: s.completedMicrotopics,
      microtopics_total: s.totalMicrotopics,
      completion_percent: s.completionPercent,
      projected_marks: s.projectedMarks,
      max_marks_per_domain: s.maxPerSubject,
    })),
  };
}

/**
 * Assembles a JSON-safe snapshot for PrepBrain AI from in-memory / IDB data.
 */
export function buildPrepBrainContext(input: PrepBrainContextInput): PrepBrainContext {
  const {
    nowIso,
    calendarToday,
    examLabel,
    examDisplayName,
    targetExamDate,
    maxScore,
    primaryMarksYear,
    rollup,
    neetYearProjections,
    cuetScoringRollup,
    tasks,
    microtopicById,
    executionSessions,
    studySessions,
    habitBundle,
    meditation30d,
    syllabus_snapshot_overrides,
    dailyPlanToday: dailyPlanFromInput,
    incompleteDailyTasksFromPastDays: incompleteDailyFromInput = 0,
    dailyPlanExecutionLagDays: dailyPlanLagFromInput = null,
  } = input;

  const allThroughToday = filterTasksThroughDate(tasks, calendarToday);
  const todayTasks = filterTasksForDate(tasks, calendarToday);
  const weightedToday = computeWeightedCompletionPercent(todayTasks, microtopicById);
  const plannedW = sumPlannedMarksWeight(todayTasks, microtopicById);

  const dailyPlanToday =
    dailyPlanFromInput != null &&
    dailyPlanFromInput.totalCount > 0
      ? dailyPlanFromInput
      : null;
  const hasUnifiedToday = dailyPlanToday != null;
  const effectiveTodayPercent = hasUnifiedToday
    ? dailyPlanToday!.percent
    : weightedToday;
  const effectiveCountForBand = hasUnifiedToday
    ? dailyPlanToday!.totalCount
    : todayTasks.length;
  const band = classifyDailyProgressBand(
    effectiveTodayPercent,
    effectiveCountForBand,
  );
  const { label: bandLabel, guidance: bandGuidance } = bandCopy(band);
  const plannedForContext = hasUnifiedToday
    ? dailyPlanToday!.totalCount
    : Math.round(plannedW * 10) / 10;
  const missed = findMissedIncompleteTasks(tasks, calendarToday);
  const daysFromAcademic = computeDaysBehindExecution(allThroughToday, calendarToday);
  const daysBehind =
    daysFromAcademic == null
      ? dailyPlanLagFromInput
      : dailyPlanLagFromInput == null
        ? daysFromAcademic
        : Math.max(daysFromAcademic, dailyPlanLagFromInput);

  const incompleteAcademic = missed.length;
  const incompleteUnified = Math.max(0, incompleteDailyFromInput);
  const countIncompletePastDays = incompleteAcademic + incompleteUnified;

  const cutoffDate = format(subDays(parseISO(calendarToday), 13), "yyyy-MM-dd");
  const recentPool = tasks.filter(
    (t) => t.assigned_date >= cutoffDate && t.assigned_date <= calendarToday,
  );
  recentPool.sort((a, b) => (a.assigned_date < b.assigned_date ? 1 : -1));
  const recent_tasks_last_two_weeks = recentPool.slice(0, RECENT_TASK_CAP).map((t) => ({
    assigned_date: t.assigned_date,
    task_status: t.status,
    title: taskTitle(t, microtopicById),
    marks_weight: Math.round(resolveTaskMarksWeight(t, microtopicById) * 10) / 10,
    estimated_minutes: t.estimated_time_minutes ?? 0,
  }));

  let execCount = 0;
  let execSeconds = 0;
  for (const s of executionSessions) {
    if (msInLastDays(s.start_time, 7)) {
      execCount++;
      execSeconds += Math.max(0, s.duration_seconds ?? 0);
    }
  }

  let studyCount = 0;
  let studySeconds = 0;
  let cameraProven = 0;
  for (const s of studySessions) {
    if (msInLastDays(s.started_at, 7)) {
      studyCount++;
      studySeconds += Math.max(0, s.duration_seconds);
      if (s.is_camera_proven) cameraProven++;
    }
  }

  const habit_names =
    habitBundle?.habits?.map((h) => h.name?.trim() || "Habit").slice(0, 20) ?? [];
  const logCutoff = format(subDays(parseISO(calendarToday), 13), "yyyy-MM-dd");
  let habitLogs14 = 0;
  if (habitBundle?.logs) {
    for (const log of habitBundle.logs) {
      if (log.completed && log.log_date >= logCutoff && log.log_date <= calendarToday) {
        habitLogs14++;
      }
    }
  }

  const r = rollup;

  return {
    context_generated_at: nowIso,
    calendar_date_today: calendarToday,
    exam_profile: {
      exam_label: examLabel,
      exam_display_name: examDisplayName,
      target_exam_date: targetExamDate,
      max_score_scale: maxScore ?? null,
      primary_marks_year: primaryMarksYear ?? null,
    },
    syllabus_snapshot: {
      overall_weighted_completion_percent:
        syllabus_snapshot_overrides?.overall_weighted_completion_percent ??
        r?.overallPercent ??
        0,
      total_marks_secured_in_syllabus_model: r?.totalMarksMastered ?? 0,
      total_marks_pool_in_syllabus_model:
        syllabus_snapshot_overrides?.total_marks_pool_in_syllabus_model ??
        r?.totalMarksPool ??
        0,
      weakest_chapters: weakChaptersFromRollup(r),
      neet_style_projections_by_year: neetYearProjections.map((p) => ({
        exam_year: p.year,
        projected_score_on_720_scale: p.projectedOutOf720,
        pattern_label: p.patternLabel,
        completion_note: p.completionNote,
      })),
      cuet_domain_summary: cuetScoringRollup ? mapCuet(cuetScoringRollup) : null,
    },
    todays_planned_work: {
      completion_percent_for_todays_planned_tasks: effectiveTodayPercent,
      todays_execution_status_label: bandLabel,
      todays_execution_guidance_line: bandGuidance,
      planned_marks_weight_total_for_today: plannedForContext,
      estimated_minutes_planned_for_today: hasUnifiedToday
        ? 0
        : sumEstimatedMinutes(todayTasks),
      count_of_incomplete_academic_tasks_from_past_days: incompleteAcademic,
      count_of_incomplete_unified_plan_tasks_from_past_days: incompleteUnified,
      count_of_incomplete_tasks_from_past_days: countIncompletePastDays,
      days_behind_on_execution: daysBehind,
    },
    recent_tasks_last_two_weeks,
    last_7_days: {
      execution_timer_sessions: {
        session_count: execCount,
        total_minutes: Math.round(execSeconds / 60),
      },
      study_sessions_with_camera: {
        session_count: studyCount,
        total_minutes: Math.round(studySeconds / 60),
        sessions_marked_camera_proven: cameraProven,
      },
    },
    habits_overview: {
      habit_names,
      completed_habit_logs_last_14_days: habitLogs14,
    },
    meditation_last_30_days: {
      session_count: meditation30d.sessionCount,
      distinct_days_with_a_session: meditation30d.distinctDays,
    },
  };
}

type PrepBrainWeakChapter =
  PrepBrainContext["syllabus_snapshot"]["weakest_chapters"][number];
type PrepBrainNeetProj =
  PrepBrainContext["syllabus_snapshot"]["neet_style_projections_by_year"][number];
type PrepBrainCuetDomainRow = NonNullable<
  PrepBrainContext["syllabus_snapshot"]["cuet_domain_summary"]
>["per_domain"][number];
type PrepBrainRecentTask = PrepBrainContext["recent_tasks_last_two_weeks"][number];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function topSubjectsFromWeakChapters(
  weakest: PrepBrainContext["syllabus_snapshot"]["weakest_chapters"],
): Array<{ subject: string; completion_percent: number }> {
  const bySubject = new Map<string, { sum: number; count: number }>();
  for (const row of weakest) {
    const key = row.subject?.trim();
    if (!key) continue;
    const current = bySubject.get(key) ?? { sum: 0, count: 0 };
    current.sum += row.percent_of_microtopics_done_in_chapter;
    current.count += 1;
    bySubject.set(key, current);
  }
  return [...bySubject.entries()]
    .map(([subject, stats]) => ({
      subject,
      completion_percent: round1(stats.sum / Math.max(1, stats.count)),
    }))
    .sort((a, b) => a.completion_percent - b.completion_percent);
}

function topSubjectsFromCuet(
  cuet: PrepBrainContext["syllabus_snapshot"]["cuet_domain_summary"],
): Array<{ subject: string; completion_percent: number }> {
  if (!cuet?.per_domain?.length) return [];
  return cuet.per_domain
    .map((d) => ({
      subject: d.subject,
      completion_percent: round1(d.completion_percent),
    }))
    .sort((a, b) => b.completion_percent - a.completion_percent);
}

/**
 * Small, bounded context for chat prompts (token-efficient).
 */
export function buildPrepBrainCompactContext(ctx: PrepBrainContext): PrepBrainCompactContext {
  const weakestBySubject = topSubjectsFromWeakChapters(
    ctx.syllabus_snapshot.weakest_chapters,
  );
  const cuetBySubject = topSubjectsFromCuet(ctx.syllabus_snapshot.cuet_domain_summary);

  const weak_top_3 = weakestBySubject.slice(0, 3);
  const strong_top_3 =
    cuetBySubject.length > 0
      ? cuetBySubject.slice(0, 3)
      : [...weakestBySubject].reverse().slice(0, 3);

  const insights: string[] = [];
  const completion = ctx.todays_planned_work.completion_percent_for_todays_planned_tasks;
  if (completion < 35) {
    insights.push("Today's planned-task completion is low; execution consistency is the biggest immediate lever.");
  } else if (completion >= 75) {
    insights.push("Today's execution is strong; protect this momentum with a fixed revision block.");
  }

  if (ctx.todays_planned_work.days_behind_on_execution != null) {
    const d = ctx.todays_planned_work.days_behind_on_execution;
    if (d >= 3) {
      insights.push(`Backlog is about ${d} days; recovering old carry-over tasks should be prioritized.`);
    }
  }

  if (
    insights.length < 2 &&
    (ctx.todays_planned_work.count_of_incomplete_unified_plan_tasks_from_past_days ?? 0) >=
      4
  ) {
    insights.push(
      "Several items on past daily plan days are still open — clear or reschedule them before the pile grows.",
    );
  }

  if (insights.length < 2 && ctx.meditation_last_30_days.distinct_days_with_a_session < 8) {
    insights.push("Meditation consistency is low; a daily 5-10 minute anchor habit can improve focus stability.");
  }
  if (insights.length === 0) {
    insights.push("Syllabus and execution data look balanced enough for incremental marks-focused optimization.");
  }

  return {
    context_generated_at: ctx.context_generated_at,
    exam: {
      label:
        ctx.exam_profile.exam_display_name ||
        ctx.exam_profile.exam_label ||
        "Exam preparation",
      target_exam_date: ctx.exam_profile.target_exam_date,
    },
    syllabus: {
      completion_percent: round1(
        ctx.syllabus_snapshot.overall_weighted_completion_percent,
      ),
      marks_secured: round1(ctx.syllabus_snapshot.total_marks_secured_in_syllabus_model),
      marks_total: round1(ctx.syllabus_snapshot.total_marks_pool_in_syllabus_model),
    },
    subjects: {
      weak_top_3,
      strong_top_3,
    },
    today_plan: {
      completion_percent: round1(
        ctx.todays_planned_work.completion_percent_for_todays_planned_tasks,
      ),
      execution_status: ctx.todays_planned_work.todays_execution_status_label,
      days_behind: ctx.todays_planned_work.days_behind_on_execution,
      incomplete_tasks_from_past_days:
        ctx.todays_planned_work.count_of_incomplete_tasks_from_past_days,
    },
    consistency: {
      execution_sessions_last_7d:
        ctx.last_7_days.execution_timer_sessions.session_count,
      study_sessions_last_7d: ctx.last_7_days.study_sessions_with_camera.session_count,
      camera_proven_sessions_last_7d:
        ctx.last_7_days.study_sessions_with_camera.sessions_marked_camera_proven,
      completed_habit_logs_last_14d:
        ctx.habits_overview.completed_habit_logs_last_14_days,
      meditation_days_last_30d:
        ctx.meditation_last_30_days.distinct_days_with_a_session,
      meditation_sessions_last_30d: ctx.meditation_last_30_days.session_count,
    },
    key_insights: insights.slice(0, 2),
  };
}

/** Server-side defense: cap oversized client payloads before Groq. Never throws on partial/malformed JSON. */
export function truncatePrepBrainContextForApi(ctx: PrepBrainContext): PrepBrainContext {
  const snap =
    ctx?.syllabus_snapshot != null &&
    typeof ctx.syllabus_snapshot === "object" &&
    !Array.isArray(ctx.syllabus_snapshot)
      ? ctx.syllabus_snapshot
      : null;

  const weak = safeArraySlice<PrepBrainWeakChapter>(
    snap?.weakest_chapters,
    WEAK_CHAPTER_CAP,
  );
  const recent = safeArraySlice<PrepBrainRecentTask>(
    ctx?.recent_tasks_last_two_weeks,
    RECENT_TASK_CAP,
  );
  const proj = safeArraySlice<PrepBrainNeetProj>(
    snap?.neet_style_projections_by_year,
    6,
  );

  const cuetRaw = snap?.cuet_domain_summary;
  const cuet =
    cuetRaw != null && typeof cuetRaw === "object" && !Array.isArray(cuetRaw)
      ? (cuetRaw as NonNullable<
          PrepBrainContext["syllabus_snapshot"]["cuet_domain_summary"]
        >)
      : null;
  const cuetSub = cuet
    ? safeArraySlice<PrepBrainCuetDomainRow>(cuet.per_domain, 12)
    : null;

  return {
    ...ctx,
    syllabus_snapshot: {
      ...(snap ?? {
        overall_weighted_completion_percent: 0,
        total_marks_secured_in_syllabus_model: 0,
        total_marks_pool_in_syllabus_model: 0,
        weakest_chapters: [],
        neet_style_projections_by_year: [],
        cuet_domain_summary: null,
      }),
      weakest_chapters: weak,
      neet_style_projections_by_year: proj,
      cuet_domain_summary: cuet
        ? {
            ...cuet,
            per_domain: cuetSub ?? [],
          }
        : null,
    },
    recent_tasks_last_two_weeks: recent,
  };
}
