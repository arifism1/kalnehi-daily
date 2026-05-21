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

  const examsField = data.exams;
  if (Array.isArray(examsField) && examsField.length > 0) {
    const blocks: string[] = [];
    for (const rawExam of examsField) {
      if (!isRecord(rawExam)) continue;
      const exam = typeof rawExam.exam === "string" ? rawExam.exam : "Exam";
      const rowsRaw = rawExam.marks_rows;
      if (!Array.isArray(rowsRaw) || rowsRaw.length === 0) {
        blocks.push(`### Marks intelligence (${exam})\n_No chapter rows for this exam this turn._`);
        continue;
      }
      blocks.push(formatMarksIntelligenceSingleExam(exam, rowsRaw as MarksIntelligenceRow[]));
    }
    const joined = blocks.filter(Boolean).join("\n\n");
    return joined.length > 0 ? joined : missingMsg;
  }

  const exam = typeof data.exam === "string" ? data.exam : "Exam";
  const hide2026ForNeetUg = isNeetUgExam(exam);

  const rowsRaw = data.marks_rows;
  if (Array.isArray(rowsRaw) && rowsRaw.length > 0) {
    return formatMarksIntelligenceSingleExam(exam, rowsRaw as MarksIntelligenceRow[]);
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

function formatMarksIntelligenceSingleExam(
  exam: string,
  rows: MarksIntelligenceRow[],
): string {
  const hide2026ForNeetUg = isNeetUgExam(exam);

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

  const multi = data.exams;
  if (Array.isArray(multi) && multi.length > 0) {
    const lines = ["### Syllabus snapshot"];
    for (const raw of multi) {
      if (!isRecord(raw)) continue;
      const exam = typeof raw.exam === "string" ? raw.exam : "your exam";
      const overall =
        typeof raw.overall_completion_percent === "number" ? raw.overall_completion_percent : 0;
      const n = typeof raw.subjects_covered === "number" ? raw.subjects_covered : 0;
      lines.push(
        `- **${exam}**: about **${overall}%** overall across **${n}** subjects with tracked progress.`,
      );
    }
    return lines.join("\n");
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

  const multiExams = data.exams;
  if (Array.isArray(multiExams) && multiExams.length > 0) {
    const parts: string[] = ["### Strong vs weak (by subject completion)"];
    for (const block of multiExams) {
      if (!isRecord(block)) continue;
      const examName = typeof block.exam === "string" ? block.exam : "Exam";
      const weak = block.weak_top_3;
      const strong = block.strong_top_3;
      const weakStr =
        Array.isArray(weak) && weak.length > 0
          ? weak.flatMap((r) => { const s = fmtSubjectRow(r); return s ? [s] : []; }).join("; ")
          : "none listed";
      const strongStr =
        Array.isArray(strong) && strong.length > 0
          ? strong.flatMap((r) => { const s = fmtSubjectRow(r); return s ? [s] : []; }).join("; ")
          : "none listed";
      parts.push(`**${examName}** — Weakest: ${weakStr}. Strongest: ${strongStr}.`);
    }
    return parts.join("\n");
  }

  const weak = data.weak_top_3;
  const strong = data.strong_top_3;
  const weakStr =
    Array.isArray(weak) && weak.length > 0
      ? weak.flatMap((r) => { const s = fmtSubjectRow(r); return s ? [s] : []; }).join("; ")
      : "none listed";
  const strongStr =
    Array.isArray(strong) && strong.length > 0
      ? strong.flatMap((r) => { const s = fmtSubjectRow(r); return s ? [s] : []; }).join("; ")
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
  const sorted = [...items].toSorted((a, b) => {
    if (!isRecord(a) || !isRecord(b)) return 0;
    const ra = typeof a.retries === "number" ? a.retries : 0;
    const rb = typeof b.retries === "number" ? b.retries : 0;
    return rb - ra;
  });
  const lines = sorted.slice(0, 20).map((raw) => {
    if (!isRecord(raw)) return "";
    const title = typeof raw.title === "string" ? raw.title : "?";
    const st = typeof raw.status === "string" ? raw.status : "";
    const g = typeof raw.group === "string" ? raw.group : "";
    const em =
      typeof raw.effort_min === "number" && Number.isFinite(raw.effort_min)
        ? `${raw.effort_min}m`
        : "—";
    const retries = typeof raw.retries === "number" ? raw.retries : 0;
    const repeatedLabel = retries >= 2 ? `[repeated ${retries}×] ` : "";
    const daysSince =
      typeof raw.days_since_last_attempt === "number"
        ? ` · ${raw.days_since_last_attempt}d since last attempt`
        : "";
    return `- ${repeatedLabel}[${st}] ${title}${g ? ` (${g})` : ""} · ~${em}${daysSince}`;
  });
  return [head, "", ...lines].join("\n");
}

export function formatDailyDebriefMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") return "";
  const entries = data.debrief_entries;
  if (!Array.isArray(entries) || entries.length === 0)
    return "### Daily debrief\n_No debrief entries in the last 7 days._";
  const lines = ["### Daily debrief (recent)"];
  for (const raw of entries.slice(0, 3)) {
    if (!isRecord(raw)) continue;
    const date = typeof raw.date === "string" ? raw.date : "?";
    const skipped = typeof raw.skipped_today === "string" && raw.skipped_today.trim()
      ? `Skipped: ${raw.skipped_today.trim()}`
      : null;
    const finished = typeof raw.finished_today === "string" && raw.finished_today.trim()
      ? `Done: ${raw.finished_today.trim()}`
      : null;
    const priority = typeof raw.tomorrow_priority === "string" && raw.tomorrow_priority.trim()
      ? `Tomorrow priority: ${raw.tomorrow_priority.trim()}`
      : null;
    const parts = [skipped, finished, priority].filter(Boolean);
    if (parts.length > 0) {
      lines.push(`**${date}**: ${parts.join(" | ")}`);
    }
  }
  return lines.join("\n");
}

export function formatMockTrendMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") return "";
  const trends = data.subject_trends;
  if (!Array.isArray(trends) || trends.length === 0) return "";
  const lines = ["### Mock score trends (per subject)"];
  for (const raw of trends) {
    if (!isRecord(raw)) continue;
    const subj = typeof raw.subject === "string" ? raw.subject : "?";
    const pct = typeof raw.latest_pct === "number" ? `${raw.latest_pct}%` : "—";
    const trend = raw.trend === "improving" ? "↑ improving"
      : raw.trend === "declining" ? "↓ declining"
      : "→ flat";
    const pts = typeof raw.data_points === "number" ? ` (${raw.data_points} tests)` : "";
    lines.push(`- ${subj}: ${pct} latest${pts} — ${trend}`);
  }
  return lines.join("\n");
}

export function formatStudyTimerStatsMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") return "";
  const days = typeof data.total_study_days_last_30d === "number" ? data.total_study_days_last_30d : null;
  const avgMin = typeof data.avg_daily_focused_minutes === "number" ? data.avg_daily_focused_minutes : null;
  const totalMin = typeof data.total_focused_minutes_last_30d === "number" ? data.total_focused_minutes_last_30d : null;
  const eff = typeof data.efficiency_ratio === "number" ? data.efficiency_ratio : null;
  if (days === null && avgMin === null) return "";
  const effStr = eff !== null ? ` | Efficiency: ${Math.round(eff * 100)}% of planned time used` : "";
  return `### Study timer (30d)\n${days ?? "—"} study days, avg ${avgMin ?? "—"} min/day focused, ${totalMin ?? "—"} min total.${effStr}`;
}

export function formatDoubtsSnapshotMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") {
    return "*Doubt tracker data unavailable.*";
  }
  const doubts = data.doubts;
  if (!Array.isArray(doubts) || doubts.length === 0) {
    return "### Doubt tracker\n_No synced doubts in Kalnehi cloud (local-only entries may exist in the app)._";
  }
  const lines = ["### Doubt tracker (recent)"];
  for (const raw of doubts) {
    if (!isRecord(raw)) continue;
    const title = typeof raw.title === "string" ? raw.title : "?";
    const status = typeof raw.status === "string" ? raw.status : "?";
    const subj = typeof raw.subject === "string" && raw.subject ? ` · ${raw.subject}` : "";
    const desc = typeof raw.description === "string" && raw.description.trim() ? raw.description.trim() : "";
    const ym = typeof raw.updated_at === "string" ? raw.updated_at : "";
    const body = desc ? ` — ${desc}` : "";
    lines.push(`- **${title}** (${status}${subj}, ${ym})${body}`);
  }
  const note = typeof data.note === "string" && data.note.trim() ? `\n_${data.note}_` : "";
  return lines.join("\n") + note;
}

export function formatMistakeLogMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") {
    return "*Mistake log unavailable.*";
  }
  const mistakes = data.mistakes;
  if (!Array.isArray(mistakes) || mistakes.length === 0) {
    return "### Mistake log\n_No mistakes logged yet._";
  }
  const lines = ["### Mistake log (recent)"];
  for (const raw of mistakes) {
    if (!isRecord(raw)) continue;
    const subject = typeof raw.subject === "string" ? raw.subject : "?";
    const topic = typeof raw.topic === "string" && raw.topic ? ` · ${raw.topic}` : "";
    const type = typeof raw.type === "string" ? raw.type : "?";
    const flag = raw.flag_revision === true ? " [revision]" : "";
    const note = typeof raw.note === "string" && raw.note.trim() ? `: ${raw.note.trim()}` : "";
    const day = typeof raw.logged_at === "string" ? raw.logged_at : "";
    lines.push(`- ${day} **${subject}**${topic} — ${type}${flag}${note}`);
  }
  return lines.join("\n");
}

export function formatMotivationContextMarkdown(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (!isRecord(data)) return "";
  if ("error" in data && data.error === "unavailable") {
    return "*Personal Motivation data unavailable.*";
  }
  const letters = data.letters;
  const voice = data.voice_affirmations;
  const vision = data.vision_captions;

  const blocks: string[] = [];

  if (Array.isArray(letters) && letters.length > 0) {
    const ls = ["### Motivation letters"];
    for (const raw of letters) {
      if (!isRecord(raw)) continue;
      const d = typeof raw.letter_date === "string" ? raw.letter_date : "?";
      const pin = raw.pinned === true ? " (pinned)" : "";
      const priv =
        typeof raw.privacy_note === "string" && raw.privacy_note.trim()
          ? raw.privacy_note.trim()
          : null;
      const excerpt =
        typeof raw.body_excerpt === "string" && raw.body_excerpt.trim()
          ? raw.body_excerpt.trim()
          : null;
      if (priv) {
        ls.push(`- **${d}**${pin}: ${priv}`);
      } else if (excerpt) {
        ls.push(`- **${d}**${pin}:\n  ${excerpt.replace(/\n+/g, "\n  ")}`);
      } else {
        ls.push(`- **${d}**${pin}: _(empty or unavailable)_`);
      }
    }
    blocks.push(ls.join("\n"));
  }

  if (Array.isArray(voice) && voice.length > 0) {
    const vs = ["### Voice affirmations (transcripts only)"];
    for (const raw of voice) {
      if (!isRecord(raw)) continue;
      const day = typeof raw.recorded_at === "string" ? raw.recorded_at : "?";
      const tags = Array.isArray(raw.tags) ? raw.tags.join(", ") : "";
      const tr = typeof raw.transcript === "string" ? raw.transcript.trim() : "";
      vs.push(`- **${day}**${tags ? ` [${tags}]` : ""}: ${tr || "—"}`);
    }
    blocks.push(vs.join("\n"));
  }

  if (Array.isArray(vision) && vision.length > 0) {
    const ph = ["### Vision board (captions only — images not shown)"];
    for (const raw of vision) {
      if (!isRecord(raw)) continue;
      const pd = typeof raw.photo_date === "string" ? raw.photo_date : "?";
      const cap = typeof raw.caption === "string" && raw.caption.trim() ? raw.caption.trim() : "(no caption)";
      const wp = raw.is_wallpaper === true ? " · wallpaper" : "";
      ph.push(`- **${pd}**${wp}: ${cap}`);
    }
    blocks.push(ph.join("\n"));
  }

  if (blocks.length === 0) {
    return "### Personal Motivation\n_No letters, voice affirmations, or vision captions in Kalnehi yet._";
  }
  return blocks.join("\n\n");
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
    case "getDailyDebriefSnapshot":
      return formatDailyDebriefMarkdown(payload);
    case "getMockTrendBySubject":
      return formatMockTrendMarkdown(payload);
    case "getStudyTimerStats":
      return formatStudyTimerStatsMarkdown(payload);
    case "getDoubtsSnapshot":
      return formatDoubtsSnapshotMarkdown(payload);
    case "getMistakeLogSnapshot":
      return formatMistakeLogMarkdown(payload);
    case "getMotivationContextSnapshot":
      return formatMotivationContextMarkdown(payload);
    default:
      return "";
  }
}

/** Stable section order for the final report. */
const TOOL_ORDER: PrepbrainToolName[] = [
  "getTodayPlan",
  "getMissedTasksContext",
  "getDailyDebriefSnapshot",
  "getStudyTimerStats",
  "getSyllabusOverview",
  "getWeakStrongSubjects",
  "getMarksIntelligence",
  "getRevisionQueueSnapshot",
  "getSyllabusBacklogSnapshot",
  "getLatestMockScores",
  "getMockTrendBySubject",
  "getHabitStreakSummary",
  "getMeditationConsistency",
  "getRecentStudyCameraData",
  "getTargetScoreBlueprint",
  "getDoubtsSnapshot",
  "getMistakeLogSnapshot",
  "getMotivationContextSnapshot",
];

/**
 * Intent → allowed tool sections. Only sections in this list are rendered for that intent.
 * Keeps the model context focused and prevents it from referencing unrelated data.
 */
const INTENT_SECTION_ALLOW: Record<string, PrepbrainToolName[]> = {
  today_plan: [
    "getSyllabusOverview",
    "getTodayPlan",
    "getMissedTasksContext",
    "getDailyDebriefSnapshot",
    "getStudyTimerStats",
    "getWeakStrongSubjects",
  ],
  marks_score: [
    "getMarksIntelligence",
    "getWeakStrongSubjects",
    "getMockTrendBySubject",
    "getSyllabusOverview",
  ],
  syllabus_progress: [
    "getSyllabusOverview",
    "getWeakStrongSubjects",
  ],
  weak_vs_strong: [
    "getSyllabusOverview",
    "getWeakStrongSubjects",
    "getMarksIntelligence",
  ],
  mock_test: [
    "getLatestMockScores",
    "getMockTrendBySubject",
    "getWeakStrongSubjects",
  ],
  avoided_topics: [
    "getSyllabusBacklogSnapshot",
    "getMockTrendBySubject",
    "getDailyDebriefSnapshot",
  ],
  revision: [
    "getRevisionQueueSnapshot",
    "getWeakStrongSubjects",
    "getMissedTasksContext",
  ],
  syllabus_backlog: [
    "getSyllabusBacklogSnapshot",
    "getSyllabusOverview",
    "getMissedTasksContext",
  ],
  target_score: [
    "getTargetScoreBlueprint",
    "getSyllabusOverview",
    "getMarksIntelligence",
  ],
  habits_or_meditation: [
    "getHabitStreakSummary",
    "getMeditationConsistency",
    "getDailyDebriefSnapshot",
    "getStudyTimerStats",
  ],
  study_camera: [
    "getRecentStudyCameraData",
    "getMissedTasksContext",
  ],
  general: [
    "getSyllabusOverview",
    "getWeakStrongSubjects",
    "getMarksIntelligence",
  ],
  doubt_tracker: [
    "getDoubtsSnapshot",
    "getSyllabusOverview",
    "getWeakStrongSubjects",
  ],
  mistake_log: [
    "getMistakeLogSnapshot",
    "getWeakStrongSubjects",
    "getMarksIntelligence",
  ],
  personal_motivation: [
    "getMotivationContextSnapshot",
    "getSyllabusOverview",
    "getWeakStrongSubjects",
  ],
};

/**
 * Converts the per-tool result map into a single condensed Markdown report (no JSON).
 * Pass `intent` to suppress sections not relevant to the current query.
 */
export function serializePrepBrainToolData(
  toolData: Record<string, unknown>,
  intent?: string,
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

    // Intent filter — only render sections relevant to this intent.
    if (intent && INTENT_SECTION_ALLOW[intent] && !INTENT_SECTION_ALLOW[intent].includes(name)) {
      continue;
    }

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
