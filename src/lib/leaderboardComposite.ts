/** Tunable weights; composite in [0, 100] for ordering within a cohort. */
export const LEADERBOARD_HOURS_WEEK_CAP = 60;
export const LEADERBOARD_COMPOSITE_HOURS_WEIGHT = 0.5;

/**
 * Weekly hours (from task session sum) + syllabus overall % (0–100) → single score.
 * Higher = better. Capped hours so logging 80h/week does not dominate syllabus.
 */
export function computeLeaderboardComposite(
  weeklyHours: number,
  syllabusOverallPct: number,
  options?: { hoursCap?: number; hoursWeight?: number },
): number {
  const cap = options?.hoursCap ?? LEADERBOARD_HOURS_WEEK_CAP;
  const w = options?.hoursWeight ?? LEADERBOARD_COMPOSITE_HOURS_WEIGHT;
  const hNorm = cap > 0 ? Math.min(1, Math.max(0, weeklyHours / cap)) : 0;
  const sNorm = Math.min(1, Math.max(0, syllabusOverallPct / 100));
  const raw = w * hNorm + (1 - w) * sNorm;
  return Math.round(raw * 10000) / 100;
}

/**
 * Matches `recompute_leaderboard_weekly_top_percents` in
 * `20260623120000_leaderboard_weekly.sql` for Postgres `rank()`: 1 = best
 * within a cohort, higher composite first.
 */
export function topPercentFromRankAndSize(
  rank: number,
  cohortSize: number,
  minCohort = 20,
): number | null {
  if (cohortSize < minCohort) return null;
  if (cohortSize <= 0 || rank < 1) return null;
  return Math.max(1, Math.min(100, Math.ceil((100 * rank) / cohortSize)));
}
