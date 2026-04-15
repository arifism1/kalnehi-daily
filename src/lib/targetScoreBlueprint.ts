import type { ChapterRollup, SyllabusRollup } from "@/lib/syllabusRollup";
import { sortSubjects } from "@/lib/syllabusGrouping";

export type TargetMarksRange = {
  /** User input after clamping to exam max */
  clampedTarget: number;
  low: number;
  high: number;
};

export type BlueprintThresholdMode = "absolute" | "gain";

export type EstimateExamMarksResult = {
  /** Linear pool sum: Σ (chapterMarks × mastery% / 100) */
  linearPool: number;
  /** Mapped to exam scale using pool / totalMarksPool × maxScore */
  estimatedExamMarks: number;
};

/**
 * Current trajectory on exam scale: Σ per chapter (mastery% × chapter marks) / pool × maxScore.
 */
export function estimateExamMarksLinear(
  rollup: SyllabusRollup,
  maxScore: number,
): EstimateExamMarksResult {
  const pool = rollup.totalMarksPool;
  if (pool <= 0 || maxScore <= 0) {
    return { linearPool: 0, estimatedExamMarks: 0 };
  }
  let linearPool = 0;
  for (const ch of rollup.chapters) {
    linearPool +=
      ch.chapterMarksTotal * (ch.microtopicProgressPercent / 100);
  }
  const estimatedExamMarks = Math.min(
    maxScore,
    Math.round((linearPool / pool) * maxScore),
  );
  return { linearPool, estimatedExamMarks };
}

export function targetToRange(rawTarget: number, maxScore: number): TargetMarksRange {
  const cap = Math.max(0, maxScore);
  const clampedTarget = Math.min(
    cap,
    Math.max(0, Math.round(Number.isFinite(rawTarget) ? rawTarget : 0)),
  );
  const margin = Math.max(15, Math.round(cap * 0.02));
  let low = clampedTarget - margin;
  let high = clampedTarget + margin;
  low = Math.max(0, low);
  high = Math.min(cap, high);
  if (low > high) {
    low = high;
  }
  return { clampedTarget, low, high };
}

export function sortChaptersForBlueprint(chapters: ChapterRollup[]): ChapterRollup[] {
  return [...chapters].sort((a, b) => {
    const mw = b.chapterMarksTotal - a.chapterMarksTotal;
    if (mw !== 0) return mw;
    return a.microtopicProgressPercent - b.microtopicProgressPercent;
  });
}

export type PickChaptersResult = {
  selected: ChapterRollup[];
  totalMarksCovered: number;
  /** True when threshold exceeded sum of all chapter weights */
  thresholdExceedsFullPool: boolean;
};

export function pickChaptersUntilThreshold(
  sorted: ChapterRollup[],
  thresholdMarks: number,
): PickChaptersResult {
  const totalPool = sorted.reduce((s, c) => s + c.chapterMarksTotal, 0);
  if (thresholdMarks <= 0) {
    return {
      selected: [],
      totalMarksCovered: 0,
      thresholdExceedsFullPool: false,
    };
  }
  if (totalPool <= 0) {
    return { selected: [], totalMarksCovered: 0, thresholdExceedsFullPool: false };
  }
  const thresholdExceedsFullPool = thresholdMarks > totalPool;
  const cap = thresholdExceedsFullPool ? totalPool : thresholdMarks;
  const selected: ChapterRollup[] = [];
  let sum = 0;
  for (const ch of sorted) {
    selected.push(ch);
    sum += ch.chapterMarksTotal;
    if (sum >= cap) break;
  }
  if (thresholdExceedsFullPool) {
    return {
      selected: [...sorted],
      totalMarksCovered: totalPool,
      thresholdExceedsFullPool: true,
    };
  }
  return {
    selected,
    totalMarksCovered: sum,
    thresholdExceedsFullPool: false,
  };
}

export function subjectSplitPercent(
  selected: ChapterRollup[],
): { subject: string; percent: number }[] {
  const total = selected.reduce((s, c) => s + c.chapterMarksTotal, 0);
  if (total <= 0) return [];
  const bySubject = new Map<string, number>();
  for (const ch of selected) {
    const sub = ch.subject || "Other";
    bySubject.set(sub, (bySubject.get(sub) ?? 0) + ch.chapterMarksTotal);
  }
  const rows: { subject: string; percent: number }[] = [];
  for (const [subject, w] of bySubject) {
    rows.push({
      subject,
      percent: Math.round((w / total) * 1000) / 10,
    });
  }
  rows.sort((a, b) => sortSubjects(a.subject, b.subject));
  return rows;
}

export function thresholdForMode(
  mode: BlueprintThresholdMode,
  range: TargetMarksRange,
  currentEstimatedExamMarks: number,
): number {
  const current = Math.round(currentEstimatedExamMarks);
  if (mode === "absolute") {
    return range.low;
  }
  return Math.max(0, range.low - current);
}
