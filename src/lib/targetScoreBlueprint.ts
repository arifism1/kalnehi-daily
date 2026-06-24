/**
 * Exam-specific (Kalnehi) Target Score Blueprint.
 *
 * The generic "max payoff per effort" math lives in the engine
 * (`@engine/planning/gapPlanner`). This module is the Kalnehi VERTICAL ADAPTER: it maps
 * `ChapterRollup` (chapter marks weight + microtopic progress) onto the engine's neutral
 * branch shape and applies Kalnehi's exam-subject ordering (PCB) on top.
 *
 * Public API and outputs are unchanged (golden-master guarded).
 */
import type { ChapterRollup, SyllabusRollup } from "@/lib/syllabusRollup";
import { sortSubjects } from "@/lib/syllabusGrouping";
import {
  gapThresholdForMode,
  groupSplitWeights,
  outcomeTargetRange,
  pickUntilThreshold,
  projectOutcomeLinear,
  sortByPayoff,
  type GapThresholdMode,
  type OutcomeTargetRange,
} from "@engine/planning/gapPlanner";

export type TargetMarksRange = OutcomeTargetRange;

export type BlueprintThresholdMode = GapThresholdMode;

export type EstimateExamMarksResult = {
  /** Linear pool sum: Σ (chapterMarks × mastery% / 100) */
  linearPool: number;
  /** Mapped to exam scale using pool / totalMarksPool × maxScore */
  estimatedExamMarks: number;
};

const chapterWeight = (c: ChapterRollup) => c.chapterMarksTotal;
const chapterProgress = (c: ChapterRollup) => c.microtopicProgressPercent;

/**
 * Current trajectory on exam scale: Σ per chapter (mastery% × chapter marks) / pool × maxScore.
 */
export function estimateExamMarksLinear(
  rollup: SyllabusRollup,
  maxScore: number,
): EstimateExamMarksResult {
  const { weightedPool, projected } = projectOutcomeLinear(
    rollup.chapters.map((c) => ({
      weight: c.chapterMarksTotal,
      progressPercent: c.microtopicProgressPercent,
    })),
    maxScore,
    rollup.totalMarksPool,
  );
  return { linearPool: weightedPool, estimatedExamMarks: projected };
}

export function targetToRange(rawTarget: number, maxScore: number): TargetMarksRange {
  return outcomeTargetRange(rawTarget, maxScore);
}

export function sortChaptersForBlueprint(chapters: ChapterRollup[]): ChapterRollup[] {
  return sortByPayoff(chapters, chapterWeight, chapterProgress);
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
  const res = pickUntilThreshold(sorted, thresholdMarks, chapterWeight);
  return {
    selected: res.selected,
    totalMarksCovered: res.totalWeightCovered,
    thresholdExceedsFullPool: res.thresholdExceedsFullPool,
  };
}

export function subjectSplitPercent(
  selected: ChapterRollup[],
): { subject: string; percent: number }[] {
  // Engine computes weight share per group; Kalnehi applies its PCB subject ordering.
  return groupSplitWeights(selected, (c) => c.subject || "Other", chapterWeight)
    .map((r) => ({ subject: r.group, percent: r.percent }))
    .sort((a, b) => sortSubjects(a.subject, b.subject));
}

export function thresholdForMode(
  mode: BlueprintThresholdMode,
  range: TargetMarksRange,
  currentEstimatedExamMarks: number,
): number {
  return gapThresholdForMode(mode, range, currentEstimatedExamMarks);
}
