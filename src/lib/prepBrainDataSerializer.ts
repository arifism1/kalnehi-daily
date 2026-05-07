/**
 * Dense Markdown serialization for PrepBrain tool payloads (8B-friendly; no raw JSON in prompts).
 */

import type {
  MarksIntelligenceRow,
  PrepbrainToolName,
} from "@/lib/prepbrainToolQueries";
import { isNeetUgExam } from "@/lib/examProfile";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function fmtNum(n: unknown): string {
  if (typeof n === "number" && Number.isFinite(n)) return String(n);
  return "—";
}

function groupMarksBySubject(rows: MarksIntelligenceRow[]): Map<string, MarksIntelligenceRow[]> {
  const m = new Map<string, MarksIntelligenceRow[]>();
  for (const r of rows) {
    const subj = r.subject?.trim() || "General";
    const arr = m.get(subj) ?? [];
    arr.push(r);
    m.set(subj, arr);
  }
  return m;
}

/** Average marks from available years (optionally ignore 2026 when not shown for NEET UG). */
function computeAvgMarks(r: MarksIntelligenceRow, ignore2026: boolean): number {
  const vals = [
    ...(ignore2026 ? [] : [r.marks_2026]),
    r.marks_2025,
    r.marks_2024,
    r.marks_2023,
  ].filter((m): m is number => m != null && m > 0);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Authoritative exam ceilings.
 * Summing catalog-chapter averages over-counts because the catalog includes more
 * chapters than can appear in a single sitting (not every chapter appears every year).
 * If the exam is known here, this value is the hard ceiling shown to the model.
 * If unknown, we omit the ceiling line entirely rather than show a wrong number.
 */
const KNOWN_EXAM_CEILINGS: Record<string, number> = {
  "CAT": 198,
  "NEET UG": 720,
  "NEET PG": 800,
  "JEE Main": 300,
  "JEE Main 2023": 300,
  "JEE Main 2024": 300,
  "JEE Main 2025": 300,
  "JEE Advanced": 360,
  "GATE": 100,
  "CLAT UG": 150,
  "NDA": 900,
  "SAT": 1600,
  "GRE": 340,
  "UPSC CSE Prelims": 400,
  "UPSC CSE Mains": 1750,
  "SSC CGL": 200,
  "SSC CHSL": 200,
  "SBI PO": 200,
  "IBPS PO": 200,
  "IPMAT Indore": 360,
  "IPMAT Rohtak": 300,
  "JIPMAT": 400,
  "INI-CET": 200,
  "CBSE Class 12": 500,
};

function getKnownExamCeiling(exam: string): number | null {
  // Direct lookup first
  if (KNOWN_EXAM_CEILINGS[exam] !== undefined) return KNOWN_EXAM_CEILINGS[exam];
  // Partial match for year-suffixed variants like "JEE Main 2025"
  for (const [key, val] of Object.entries(KNOWN_EXAM_CEILINGS)) {
    if (exam.toLowerCase().startsWith(key.toLowerCase())) return val;
  }
  return null;
}

/** Structured marks from RPC (`marks_rows`). Shows estimated available marks per chapter. */
export function formatMarksIntelligenceMarkdown(data: unknown): string {
  const missingMsg =
    "*No marks intelligence rows returned (exam or catalog data may be missing).*";
  if (data === null || data === undefined) return missingMsg;
  if (!isRecord(data)) return missingMsg;
  if ("error" in data && data.error === "unavailable") {
    return "*Marks intelligence unavailable this turn.*";
  }

  const exam = typeof data.exam === "string" ? data.exam : "Exam";
  const hide2026ForNeetUg = isNeetUgExam(exam);

  const rowsRaw = data.marks_rows;
  if (Array.isArray(rowsRaw) && rowsRaw.length > 0) {
    const rows = rowsRaw as MarksIntelligenceRow[];

    const sum2026 = rows.reduce((s, r) => s + (r.marks_2026 ?? 0), 0);
    const sum2025 = rows.reduce((s, r) => s + (r.marks_2025 ?? 0), 0);
    const sum2024 = rows.reduce((s, r) => s + (r.marks_2024 ?? 0), 0);
    const sum2023 = rows.reduce((s, r) => s + (r.marks_2023 ?? 0), 0);
    const derivedCeiling = hide2026ForNeetUg
      ? sum2025 > 0
        ? sum2025
        : sum2024 > 0
          ? sum2024
          : sum2023 > 0
            ? sum2023
            : null
      : sum2026 > 0
        ? sum2026
        : sum2025 > 0
          ? sum2025
          : sum2024 > 0
            ? sum2024
            : sum2023 > 0
              ? sum2023
              : null;
    const ceiling = derivedCeiling ?? getKnownExamCeiling(exam);

    const bySubj = groupMarksBySubject(rows);
    const lines: string[] = [`### Marks intelligence (${exam})`];
    if (ceiling !== null) {
      lines.push(`Exam marks ceiling: ${Math.round(ceiling)} marks total`);
    }
    lines.push("");
    for (const [subject, chRows] of bySubj) {
      lines.push(`**${subject}**`);
      for (const r of chRows) {
        const ch = r.chapter?.trim() || "Chapter";
        const avgMarks = computeAvgMarks(r, hide2026ForNeetUg);
        // Available = uncovered fraction of avg marks
        const available = Math.round(avgMarks * (1 - r.completion_pct / 100));
        const topicsLeft = r.total_topics - r.done_topics;

        lines.push(
          `- ${ch}: ~${available} marks available (${fmtNum(r.completion_pct)}% done, ${topicsLeft} of ${fmtNum(r.total_topics)} topics remaining)`,
        );
      }
      lines.push("");
    }
    return lines.join("\n").trimEnd();
  }

  // Cached legacy shape: preformatted lines only
  const legacy = data.top_chapters_by_opportunity;
  if (Array.isArray(legacy) && legacy.length > 0) {
    const lines: string[] = [
      `### Marks intelligence (${exam})`,
      "",
      ...legacy.map((line) => `- ${String(line)}`),
    ];
    return lines.join("\n");
  }

  return missingMsg;
}

export function formatTodayPlanMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") {
    return "*Today's plan data unavailable.*";
  }

  const date = typeof data.date === "string" ? data.date : "today";
  const tasksTotal = typeof data.tasks_total === "number" ? data.tasks_total : 0;
  const completed = typeof data.tasks_completed === "number" ? data.tasks_completed : 0;
  const pct = typeof data.completion_percent === "number" ? data.completion_percent : 0;
  const planned = typeof data.planned_minutes === "number" ? data.planned_minutes : 0;

  const header = `### Today's plan (${date})`;
  const summary = `Summary: ${completed}/${tasksTotal} tasks done (${pct}%); ~${planned} min planned.`;

  const items = data.task_items;
  if (Array.isArray(items) && items.length > 0) {
    const bullets: string[] = [header, "", summary, ""];
    for (const raw of items) {
      if (!isRecord(raw)) continue;
      const status = typeof raw.status === "string" ? raw.status : "?";
      const name = typeof raw.name === "string" ? raw.name : "Task";
      const weightLabel =
        typeof raw.marks_weight === "number" && Number.isFinite(raw.marks_weight)
          ? String(raw.marks_weight)
          : "—";
      const est =
        typeof raw.estimated_minutes === "number" && Number.isFinite(raw.estimated_minutes)
          ? raw.estimated_minutes
          : 0;
      bullets.push(`- [${status}] ${name} (Weight: ${weightLabel}, Est: ${est}m)`);
    }
    return bullets.join("\n");
  }

  return [header, "", summary, "", "_No tasks listed for this date._"].join("\n");
}

export function formatSyllabusOverviewMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") {
    return "*Syllabus overview unavailable.*";
  }
  const exam = typeof data.exam === "string" ? data.exam : "your exam";
  const overall =
    typeof data.overall_completion_percent === "number" ? data.overall_completion_percent : 0;
  const n = typeof data.subjects_covered === "number" ? data.subjects_covered : 0;
  return `### Syllabus snapshot\n${exam}: about **${overall}%** overall syllabus completion across **${n}** subjects with tracked progress.`;
}

export function formatWeakStrongMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") {
    return "*Weak/strong subjects unavailable.*";
  }

  function fmtSubjectRow(row: unknown): string {
    if (!isRecord(row) || typeof row.subject !== "string") return "";
    const pct = fmtNum(row.completion_percent);
    const rem =
      typeof row.topics_remaining === "number" && row.topics_remaining > 0
        ? `, ${row.topics_remaining} topics left`
        : "";
    return `${row.subject} (${pct}%${rem})`;
  }

  const weak = data.weak_top_3;
  const strong = data.strong_top_3;
  const weakStr =
    Array.isArray(weak) && weak.length > 0
      ? weak.map(fmtSubjectRow).filter(Boolean).join("; ")
      : "none listed";
  const strongStr =
    Array.isArray(strong) && strong.length > 0
      ? strong.map(fmtSubjectRow).filter(Boolean).join("; ")
      : "none listed";
  return `### Strong vs weak (by subject completion)\nWeakest: ${weakStr}.\nStrongest: ${strongStr}.`;
}

export function formatMissedTasksMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") return "";
  const missed =
    typeof data.missed_tasks_last_7d === "number" ? data.missed_tasks_last_7d : 0;
  const total =
    typeof data.total_tasks_last_7d === "number" ? data.total_tasks_last_7d : 0;
  const rate =
    typeof data.execution_rate_percent === "number" ? data.execution_rate_percent : 0;
  if (total === 0) return "### Execution (7d)\nNo past tasks in last 7 days.";
  return `### Execution (7d)\n${missed} missed / ${total} planned tasks — ${rate}% execution rate.`;
}

export function formatRevisionQueueMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") return "";
  const total =
    typeof data.total_pending === "number" ? data.total_pending : 0;
  const overdue =
    typeof data.overdue_count === "number" ? data.overdue_count : 0;
  const dueToday =
    typeof data.due_today === "number" ? data.due_today : 0;
  if (total === 0)
    return "### Revision queue\nNo pending revision items.";
  return `### Revision queue\n${total} pending items — ${overdue} overdue, ${dueToday} due today.`;
}

export function formatMockScoresMarkdown(data: unknown): string {
  if (data === null || data === undefined)
    return "### Mock tests\n_No mock tests recorded yet._";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable")
    return "*Mock test data unavailable.*";
  const tests = data.recent_tests;
  if (!Array.isArray(tests) || tests.length === 0)
    return "### Mock tests\n_No mock tests recorded yet._";
  const lines = ["### Mock tests (recent)"];
  for (const t of tests) {
    if (!isRecord(t)) continue;
    const name = typeof t.test_name === "string" ? t.test_name : "Test";
    const date = typeof t.test_date === "string" ? t.test_date : "?";
    const score =
      typeof t.total_score === "number" ? t.total_score : null;
    const max = typeof t.max_score === "number" ? t.max_score : null;
    const rating =
      typeof t.self_rating === "string" && t.self_rating
        ? ` (self: ${t.self_rating})`
        : "";
    const scoreStr =
      score !== null && max !== null
        ? `${score}/${max}`
        : score !== null
          ? String(score)
          : "—";
    lines.push(`**${name}** (${date}): ${scoreStr}${rating}`);
    const subjectScores = t.subject_scores;
    if (Array.isArray(subjectScores) && subjectScores.length > 0) {
      for (const s of subjectScores) {
        if (!isRecord(s)) continue;
        const subj = typeof s.subject === "string" ? s.subject : "?";
        const ss = typeof s.score === "number" ? s.score : null;
        const sm = typeof s.max_score === "number" ? s.max_score : null;
        const ssStr =
          ss !== null && sm !== null
            ? `${ss}/${sm}`
            : ss !== null
              ? String(ss)
              : "—";
        lines.push(`  - ${subj}: ${ssStr}`);
      }
    }
  }
  return lines.join("\n");
}

export function formatWellnessOneLine(habits: unknown, meditation: unknown): string {
  let habitsPart = "";
  if (isRecord(habits) && !("error" in habits && habits.error === "unavailable")) {
    const n =
      typeof habits.completed_logs_last_14d === "number" ? habits.completed_logs_last_14d : 0;
    habitsPart = `Habits: ${n} completed last 14 days.`;
  }
  let medPart = "";
  if (isRecord(meditation) && !("error" in meditation && meditation.error === "unavailable")) {
    const s =
      typeof meditation.sessions_last_30d === "number" ? meditation.sessions_last_30d : 0;
    medPart = `Meditation: ${s} sessions last 30 days.`;
  }
  if (!habitsPart && !medPart) return "";
  const parts = [habitsPart, medPart].filter(Boolean);
  return `### Wellness\n${parts.join(" ")}`;
}

export function formatHabitsOnlyMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") return "";
  const n =
    typeof data.completed_logs_last_14d === "number" ? data.completed_logs_last_14d : 0;
  const streak = typeof data.streak_days === "number" ? data.streak_days : 0;
  const hc = typeof data.habits_count === "number" ? data.habits_count : 0;
  return `### Habits\n${n} completed logs (14d), ${streak}-day streak, ${hc} habits tracked.`;
}

export function formatMeditationOnlyMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") return "";
  const s =
    typeof data.sessions_last_30d === "number" ? data.sessions_last_30d : 0;
  const d =
    typeof data.distinct_days_last_30d === "number" ? data.distinct_days_last_30d : 0;
  return `### Meditation\n${s} sessions last 30 days (${d} distinct days).`;
}

export function formatStudyCameraMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") {
    return "*Study session / camera data unavailable.*";
  }
  const sessions = typeof data.sessions_last_7d === "number" ? data.sessions_last_7d : 0;
  const cam = typeof data.camera_proven_sessions_last_7d === "number" ? data.camera_proven_sessions_last_7d : 0;
  const rate =
    typeof data.camera_proven_rate_percent === "number" ? data.camera_proven_rate_percent : 0;
  const min = typeof data.total_minutes_last_7d === "number" ? data.total_minutes_last_7d : 0;
  return `### Study sessions (7d)\n${sessions} sessions (~${min} min); ${cam} camera-proven (${rate}% of sessions).`;
}

export function formatTargetBlueprintMarkdown(data: unknown): string {
  if (data === null) {
    return "### Target score blueprint\n_No saved blueprint in Kalnehi._";
  }
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") {
    return "*Target blueprint unavailable.*";
  }
  const exam = typeof data.exam === "string" ? data.exam : "Exam";
  const mode = typeof data.mode === "string" ? data.mode : "";
  const target = typeof data.target_score === "number" ? data.target_score : null;
  const low = typeof data.range_low === "number" ? data.range_low : null;
  const high = typeof data.range_high === "number" ? data.range_high : null;
  const est = typeof data.estimated_at_save === "number" ? data.estimated_at_save : null;
  const cov = typeof data.marks_covered === "number" ? data.marks_covered : null;
  return `### Target score blueprint\n${exam} (${mode}): target **${target ?? "—"}**, estimated range **${low ?? "—"}–${high ?? "—"}**, estimated at save **${est ?? "—"}**, marks covered **${cov ?? "—"}**.`;
}

export function formatBacklogSnapshotMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") {
    return "*Backlog snapshot unavailable.*";
  }
  const days =
    typeof data.days_until_exam === "number" && Number.isFinite(data.days_until_exam)
      ? data.days_until_exam
      : null;
  const head =
    days !== null
      ? `### Syllabus backlog\nDays until target exam (if set): **${days}**`
      : "### Syllabus backlog\nTarget exam date not set — suggest they add it in Profile.";
  const items = data.backlog_items;
  if (!Array.isArray(items) || items.length === 0) {
    return `${head}\n_No open backlog rows._`;
  }
  const lines = items.slice(0, 20).map((raw) => {
    if (!isRecord(raw)) return "";
    const title = typeof raw.title === "string" ? raw.title : "?";
    const st = typeof raw.status === "string" ? raw.status : "";
    const g = typeof raw.group === "string" ? raw.group : "";
    const em =
      typeof raw.effort_min === "number" && Number.isFinite(raw.effort_min)
        ? `${raw.effort_min}m`
        : "—";
    return `- [${st}] ${title}${g ? ` (${g})` : ""} · ~${em}`;
  });
  return [head, "", ...lines].join("\n");
}

function formatToolSection(name: PrepbrainToolName, payload: unknown): string {
  switch (name) {
    case "getTodayPlan":
      return formatTodayPlanMarkdown(payload);
    case "getSyllabusOverview":
      return formatSyllabusOverviewMarkdown(payload);
    case "getWeakStrongSubjects":
      return formatWeakStrongMarkdown(payload);
    case "getMarksIntelligence":
      return formatMarksIntelligenceMarkdown(payload);
    case "getHabitStreakSummary":
      return formatHabitsOnlyMarkdown(payload);
    case "getMeditationConsistency":
      return formatMeditationOnlyMarkdown(payload);
    case "getRecentStudyCameraData":
      return formatStudyCameraMarkdown(payload);
    case "getTargetScoreBlueprint":
      return formatTargetBlueprintMarkdown(payload);
    case "getMissedTasksContext":
      return formatMissedTasksMarkdown(payload);
    case "getRevisionQueueSnapshot":
      return formatRevisionQueueMarkdown(payload);
    case "getLatestMockScores":
      return formatMockScoresMarkdown(payload);
    case "getSyllabusBacklogSnapshot":
      return formatBacklogSnapshotMarkdown(payload);
    default:
      return "";
  }
}

/** Stable section order for the final report. */
const TOOL_ORDER: PrepbrainToolName[] = [
  "getTodayPlan",
  "getMissedTasksContext",
  "getSyllabusOverview",
  "getWeakStrongSubjects",
  "getMarksIntelligence",
  "getRevisionQueueSnapshot",
  "getSyllabusBacklogSnapshot",
  "getLatestMockScores",
  "getHabitStreakSummary",
  "getMeditationConsistency",
  "getRecentStudyCameraData",
  "getTargetScoreBlueprint",
];

/**
 * Converts the per-tool result map into a single condensed Markdown report (no JSON).
 */
export function serializePrepBrainToolData(
  toolData: Record<string, unknown>,
): string {
  const blocks: string[] = [];

  const habitPayload = toolData.getHabitStreakSummary;
  const medPayload = toolData.getMeditationConsistency;
  const wellnessLine = formatWellnessOneLine(habitPayload, medPayload);
  const hasBothWellness =
    toolData.getHabitStreakSummary !== undefined &&
    toolData.getMeditationConsistency !== undefined;

  for (const name of TOOL_ORDER) {
    if (!(name in toolData)) continue;

    if (hasBothWellness && (name === "getHabitStreakSummary" || name === "getMeditationConsistency")) {
      if (name === "getHabitStreakSummary") {
        const w = wellnessLine.trim();
        if (w) blocks.push(w);
      }
      continue;
    }

    const section = formatToolSection(name, toolData[name]);
    if (section.trim()) blocks.push(section);
  }

  const out = blocks.filter(Boolean).join("\n\n").trim();
  return out || "*No Kalnehi prep data was available for this turn.*";
}
