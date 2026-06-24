import { isJeeMainsExam, isNeetUgExam } from "@/lib/examProfile";

export type RankBandEstimate = {
  /** Human label e.g. "Top 5k" or "99+ percentile" */
  label: string;
  /** AIR range when applicable */
  rankMin: number | null;
  rankMax: number | null;
  /** Percentile when applicable (JEE Main) */
  percentile: number | null;
  examName: string;
};

export type ExamScoreRankBandRow = {
  exam_name: string;
  score_min: number;
  score_max: number;
  rank_min: number | null;
  rank_max: number | null;
  percentile: number | null;
  label: string | null;
  sort_order: number;
};

/** Resolve catalog exam_name key used in exam_score_rank_bands. */
export function rankBandExamKey(exam: string | null | undefined): string | null {
  if (!exam?.trim()) return null;
  if (isNeetUgExam(exam)) return "NEET UG";
  if (isJeeMainsExam(exam)) return "JEE Main";
  const n = exam.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (n === "jee advanced") return "JEE Advanced";
  if (n === "neet pg") return "NEET PG";
  return null;
}

/**
 * Map projected score to an approximate rank/percentile band from static data.
 * Returns null when exam has no bands or score is invalid.
 */
export function estimateRankFromBands(
  exam: string | null | undefined,
  projectedScore: number,
  bands: ExamScoreRankBandRow[],
): RankBandEstimate | null {
  const key = rankBandExamKey(exam);
  if (!key || !Number.isFinite(projectedScore) || projectedScore <= 0) return null;

  const examBands = bands
    .filter((b) => b.exam_name === key)
    .toSorted((a, b) => a.sort_order - b.sort_order);

  if (examBands.length === 0) return null;

  const score = Math.round(projectedScore);
  const match =
    examBands.find((b) => score >= b.score_min && score <= b.score_max) ??
    examBands[examBands.length - 1];

  if (!match) return null;

  return {
    label: match.label?.trim() || "Estimate",
    rankMin: match.rank_min,
    rankMax: match.rank_max,
    percentile: match.percentile,
    examName: key,
  };
}

/** Display string for UI — always prefixed as estimate. */
export function formatRankEstimateDisplay(estimate: RankBandEstimate): string {
  if (estimate.percentile != null && Number.isFinite(estimate.percentile)) {
    return `~${estimate.percentile}%ile`;
  }
  if (estimate.rankMin != null && estimate.rankMax != null) {
    if (estimate.rankMax <= 100) return `~AIR ${estimate.rankMin.toLocaleString("en-IN")}`;
    return `~AIR ${estimate.rankMin.toLocaleString("en-IN")}–${estimate.rankMax.toLocaleString("en-IN")}`;
  }
  return estimate.label;
}
