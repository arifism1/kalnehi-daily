/**
 * GOLDEN-MASTER parity harness (Step 3, pre-extraction).
 *
 * Purpose: freeze the exact numeric/labeled outputs of the engine-candidate math
 * (OutcomeMetric / Progress -> ProjectedOutcome / GapPlanner / Leaderboard) across a
 * broad set of real exam shapes BEFORE the engine extraction moves this code into
 * `src/engine/**`. After extraction, the public `@/lib/*` modules re-export the engine,
 * so this harness MUST keep producing byte-identical results — that diff is the parity gate.
 *
 * Deliberately imports from the CURRENT public locations (`../syllabusRollup`, etc.).
 * Do NOT change these imports during extraction; keep the lib modules as thin
 * re-exports of the engine so this file is a true before/after invariant.
 */
import type { Task, Microtopic } from "@/store/useTaskStore";

import type { SyllabusRow } from "../syllabusGrouping";
import {
  computeSyllabusRollup,
  computeNeetYearProjections,
  averageProjectedOutOfMax,
  computeCuetScoringRollup,
  chapterMarksPoolForYearRows,
} from "../syllabusRollup";
import {
  estimateExamMarksLinear,
  targetToRange,
  sortChaptersForBlueprint,
  pickChaptersUntilThreshold,
  subjectSplitPercent,
  thresholdForMode,
} from "../targetScoreBlueprint";
import {
  computeLeaderboardComposite,
  topPercentFromRankAndSize,
} from "../leaderboardComposite";
import {
  computeWeightedMarksTotals,
  computeWeightedCompletionPercent,
  classifyDailyProgressBand,
  classifyProgressMessageWithScope,
} from "../progressEngine";

// ── Builders ──────────────────────────────────────────────────────────────────

function row(
  id: string,
  subject: string,
  chapter: string,
  marks: number,
  years: readonly number[] = [2026, 2025, 2024, 2023],
): SyllabusRow {
  const r: Record<string, unknown> = {
    id,
    subject,
    chapter,
    microtopic: `micro-${id}`,
  };
  for (const y of years) r[`marks_${y}`] = marks;
  return r as unknown as SyllabusRow;
}

function task(
  id: string,
  status: "completed" | "not_begun",
  opts: {
    marksValue?: number | null;
    marksWeight?: number | null;
    microtopicId?: string | null;
    date?: string;
    minutes?: number | null;
  } = {},
): Task {
  return {
    id,
    status,
    marks_value: opts.marksValue ?? null,
    marks_weight: opts.marksWeight ?? null,
    microtopic_id: opts.microtopicId ?? null,
    assigned_date: opts.date ?? "2026-06-19",
    estimated_time_minutes: opts.minutes ?? null,
  } as unknown as Task;
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const neetRows: SyllabusRow[] = [
  row("p1", "Physics", "Kinematics", 8),
  row("p2", "Physics", "Kinematics", 8),
  row("c1", "Chemistry", "Mole Concept", 12),
  row("c2", "Chemistry", "Mole Concept", 12),
  row("b1", "Biology", "Genetics", 20),
  row("b2", "Biology", "Genetics", 20),
  row("b3", "Biology", "Genetics", 20),
];

const neetPartial: Record<string, string> = {
  p1: "completed",
  p2: "completed", // Physics chapter fully done
  c1: "completed",
  c2: "not_begun", // Chemistry blocked
  b1: "completed",
  b2: "completed",
  b3: "not_begun", // Biology blocked
};
const neetAll: Record<string, string> = Object.fromEntries(
  neetRows.map((r) => [r.id, "completed"]),
);
const neetNone: Record<string, string> = {};

// JEE multi-exam duplicate chapter keys (mirrors syllabusRollup.multiExam.test.ts)
const jeeA: SyllabusRow[] = [
  row("a1", "Physics", "Kinematics", 10, [2025, 2024, 2023]),
  row("a2", "Physics", "Kinematics", 10, [2025, 2024, 2023]),
];
const jeeB: SyllabusRow[] = [
  row("b1", "Physics", "Kinematics", 10, [2025, 2024, 2023]),
  row("b2", "Physics", "Kinematics", 10, [2025, 2024, 2023]),
];
const jeeMergedStatus: Record<string, string> = {
  a1: "completed",
  a2: "completed",
  b1: "completed",
  b2: "not_begun",
};

// UPSC-scale (2350) — reuse NEET rows shape but project onto 2350
const upscStatus = neetPartial;

// CUET domain subjects
const cuetRows: SyllabusRow[] = [
  row("e1", "English", "Reading", 0),
  row("e2", "English", "Grammar", 0),
  row("ph1", "Physics", "Optics", 0),
  row("ph2", "Physics", "Optics", 0),
  row("ch1", "Chemistry", "Organic", 0),
];
const cuetStatus: Record<string, string> = {
  e1: "completed",
  e2: "completed",
  ph1: "completed",
  ph2: "not_begun",
  ch1: "not_begun",
};

// ── Harness ─────────────────────────────────────────────────────────────────

/**
 * Returns a fully serializable snapshot of every tracked computation.
 * Stable key order; numbers only — safe for JSON deep-equality diffing.
 */
export function buildGoldenMaster(): Record<string, unknown> {
  const neetRollupPartial = computeSyllabusRollup(neetRows, neetPartial, 2026);
  const neetRollupAll = computeSyllabusRollup(neetRows, neetAll, 2026);
  const neetRollupNone = computeSyllabusRollup(neetRows, neetNone, 2026);
  const emptyRollup = computeSyllabusRollup([], {}, 2026);

  const upscRollup = computeSyllabusRollup(neetRows, upscStatus, 2026);

  // GapPlanner inputs
  const sortedForBlueprint = sortChaptersForBlueprint(neetRollupPartial.chapters);
  const range720 = targetToRange(650, 720);
  const currentEstimate = estimateExamMarksLinear(neetRollupPartial, 720)
    .estimatedExamMarks;
  const gainThreshold = thresholdForMode("gain", range720, currentEstimate);
  const picked = pickChaptersUntilThreshold(sortedForBlueprint, gainThreshold);

  return {
    syllabusRollup: {
      neet_partial: neetRollupPartial,
      neet_all: neetRollupAll,
      neet_none: neetRollupNone,
      empty: emptyRollup,
      jee_A: computeSyllabusRollup(jeeA, jeeMergedStatus, 2025),
      jee_B: computeSyllabusRollup(jeeB, jeeMergedStatus, 2025),
      jee_merged: computeSyllabusRollup([...jeeA, ...jeeB], jeeMergedStatus, 2025),
    },
    projections: {
      neet_partial_720: computeNeetYearProjections(neetRows, neetPartial, 720),
      neet_all_720: computeNeetYearProjections(neetRows, neetAll, 720),
      neet_none_720: computeNeetYearProjections(neetRows, neetNone, 720),
      upsc_2350: computeNeetYearProjections(neetRows, upscStatus, 2350),
      empty_720: computeNeetYearProjections([], {}, 720),
      avg_neet_partial: averageProjectedOutOfMax(
        computeNeetYearProjections(neetRows, neetPartial, 720),
      ),
      avg_empty: averageProjectedOutOfMax([]),
    },
    outcomeMetric: {
      neet_partial_720: estimateExamMarksLinear(neetRollupPartial, 720),
      neet_all_720: estimateExamMarksLinear(neetRollupAll, 720),
      neet_none_720: estimateExamMarksLinear(neetRollupNone, 720),
      upsc_2350: estimateExamMarksLinear(upscRollup, 2350),
      empty_720: estimateExamMarksLinear(emptyRollup, 720),
      zero_max: estimateExamMarksLinear(neetRollupPartial, 0),
    },
    targetRange: {
      neet_650_720: targetToRange(650, 720),
      neet_zero_720: targetToRange(0, 720),
      cuet_300_300: targetToRange(300, 300),
      upsc_over_2350: targetToRange(2400, 2350),
      upsc_1900_2350: targetToRange(1900, 2350),
    },
    gapPlanner: {
      sorted_subjects_marks: sortedForBlueprint.map((c) => ({
        subject: c.subject,
        chapter: c.chapter,
        chapterMarksTotal: c.chapterMarksTotal,
        microtopicProgressPercent: c.microtopicProgressPercent,
      })),
      gain_threshold: gainThreshold,
      picked_total_covered: picked.totalMarksCovered,
      picked_count: picked.selected.length,
      picked_exceeds_full_pool: picked.thresholdExceedsFullPool,
      subject_split: subjectSplitPercent(picked.selected),
      absolute_threshold: thresholdForMode("absolute", range720, currentEstimate),
    },
    cuet: {
      scoring: computeCuetScoringRollup(cuetRows, cuetStatus, [
        "English",
        "Physics",
        "Chemistry",
      ]),
      empty_domains: computeCuetScoringRollup(cuetRows, cuetStatus, []),
    },
    chapterMarksPool: {
      duplicated_equal: chapterMarksPoolForYearRows(
        [row("x1", "S", "C", 10), row("x2", "S", "C", 10)],
        2026,
      ),
      split_weights: chapterMarksPoolForYearRows(
        [row("y1", "S", "C", 4), row("y2", "S", "C", 6)],
        2026,
      ),
      no_data: chapterMarksPoolForYearRows([row("z1", "S", "C", 0)], 2026),
    },
    leaderboard: {
      composite_full: computeLeaderboardComposite(60, 100),
      composite_mixed: computeLeaderboardComposite(30, 50),
      composite_over_cap: computeLeaderboardComposite(80, 73.5),
      composite_zero: computeLeaderboardComposite(0, 0),
      top_pct_best: topPercentFromRankAndSize(1, 100),
      top_pct_mid: topPercentFromRankAndSize(50, 100),
      top_pct_small_cohort: topPercentFromRankAndSize(1, 10),
    },
    progress: {
      weighted_totals: computeWeightedMarksTotals(
        [
          task("t1", "completed", { marksValue: 8 }),
          task("t2", "not_begun", { marksWeight: 5 }),
          task("t3", "completed", { microtopicId: "m1" }),
        ],
        { m1: { marks_2026: 12 } as unknown as Microtopic },
      ),
      weighted_pct: computeWeightedCompletionPercent(
        [
          task("t1", "completed", { marksValue: 8 }),
          task("t2", "not_begun", { marksWeight: 5 }),
        ],
        {},
      ),
      band_flawless: classifyDailyProgressBand(100, 5),
      band_strong: classifyDailyProgressBand(85, 5),
      band_mediocre: classifyDailyProgressBand(60, 5),
      band_danger: classifyDailyProgressBand(20, 5),
      band_no_plan: classifyDailyProgressBand(0, 0),
      msg_perfect: classifyProgressMessageWithScope(
        [task("t1", "completed", { marksValue: 1 })],
        97,
      ),
      msg_partial: classifyProgressMessageWithScope(
        [task("t1", "not_begun", { marksValue: 1 })],
        60,
      ),
      msg_behind_empty: classifyProgressMessageWithScope([], 0, 0),
    },
  };
}
