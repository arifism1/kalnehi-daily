/**
 * Shared types for merging unified daily-plan (`daily_tasks`) progress with
 * academic-task (`tasks` table) weighted completion.
 *
 * Priority rule (matches HomeDashboardBody): prefer daily-plan data for a
 * given date when a `daily_plans` row exists and has at least one
 * `daily_tasks` row. Otherwise fall back to weighted completion of tasks.
 */

/** Per-date snapshot fetched from `daily_plans` + `daily_tasks`. */
export type DailyPlanDateSnapshot = {
  totalCount: number;
  doneCount: number;
  /** round(doneCount / totalCount * 100) — 0 when totalCount is 0 */
  percent: number;
};

/**
 * Map from `yyyy-MM-dd` to daily-plan progress.
 * An absent key means no `daily_plans` row exists for that date.
 */
export type DailyPlanProgressMap = Map<string, DailyPlanDateSnapshot>;
