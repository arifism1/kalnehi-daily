/**
 * Dense Markdown serialization for PrepBrain tool payloads (8B-friendly; no raw JSON in prompts).
 */

import type {
  MarksIntelligenceRow,
  PrepbrainToolName,
} from "@/lib/prepbrainToolQueries";

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

/**
 * Relative priority label vs dataset mean — strictly binary, no marks numbers.
 * Sending raw mark counts to the LLM causes hallucination (the model echoes and
 * extrapolates numbers that are catalog estimates, not ground truth).
 */
function getYieldBadge(r: MarksIntelligenceRow, examAverage: number): string {
  const validMarks = [r.marks_2023, r.marks_2024, r.marks_2025].filter(
    (m) => m != null && m > 0,
  );
  if (validMarks.length === 0) return "";

  const avg = validMarks.reduce((a, b) => a + b, 0) / validMarks.length;

  if (examAverage > 0) {
    if (avg >= examAverage * 1.5) return "(High Priority)";
    if (avg >= examAverage * 0.8) return "(Medium Priority)";
  }
  return "";
}

/** Structured marks from RPC (`marks_rows`). */
export function formatMarksIntelligenceMarkdown(data: unknown): string {
  const missingMsg =
    "*No marks intelligence rows returned (exam or catalog data may be missing).*";
  if (data === null || data === undefined) return missingMsg;
  if (!isRecord(data)) return missingMsg;
  if ("error" in data && data.error === "unavailable") {
    return "*Marks intelligence unavailable this turn.*";
  }

  const exam = typeof data.exam === "string" ? data.exam : "Exam";

  const rowsRaw = data.marks_rows;
  if (Array.isArray(rowsRaw) && rowsRaw.length > 0) {
    const rows = rowsRaw as MarksIntelligenceRow[];

    let totalMarks = 0;
    let validChaptersCount = 0;
    for (const r of rows) {
      const validMarks = [r.marks_2023, r.marks_2024, r.marks_2025].filter(
        (m) => m != null && m > 0,
      );
      if (validMarks.length > 0) {
        totalMarks += validMarks.reduce((a, b) => a + b, 0) / validMarks.length;
        validChaptersCount++;
      }
    }
    const examAverage = validChaptersCount > 0 ? totalMarks / validChaptersCount : 0;

    const bySubj = groupMarksBySubject(rows);
    const lines: string[] = [
      `### Marks intelligence (${exam})`,
      "",
    ];
    for (const [subject, chRows] of bySubj) {
      lines.push(`### ${subject}`);
      for (const r of chRows) {
        const ch = r.chapter?.trim() || "Chapter";
        const yieldBadge = getYieldBadge(r, examAverage);
        const badgeStr = yieldBadge ? ` ${yieldBadge}` : "";

        lines.push(
          `- **${subject} — ${ch}**${badgeStr}: ${fmtNum(r.completion_pct)}% done (${fmtNum(r.done_topics)}/${fmtNum(r.total_topics)} topics).`,
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
  const weak = data.weak_top_3;
  const strong = data.strong_top_3;
  const weakStr =
    Array.isArray(weak) && weak.length > 0
      ? weak
          .map((row) =>
            isRecord(row) && typeof row.subject === "string"
              ? `${row.subject} (${fmtNum(row.completion_percent)}%)`
              : "",
          )
          .filter(Boolean)
          .join(", ")
      : "none listed";
  const strongStr =
    Array.isArray(strong) && strong.length > 0
      ? strong
          .map((row) =>
            isRecord(row) && typeof row.subject === "string"
              ? `${row.subject} (${fmtNum(row.completion_percent)}%)`
              : "",
          )
          .filter(Boolean)
          .join(", ")
      : "none listed";
  return `### Strong vs weak (by subject completion)\nWeakest subjects: ${weakStr}. Strongest: ${strongStr}.`;
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
    default:
      return "";
  }
}

/** Stable section order for the final report. */
const TOOL_ORDER: PrepbrainToolName[] = [
  "getTodayPlan",
  "getSyllabusOverview",
  "getWeakStrongSubjects",
  "getMarksIntelligence",
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
