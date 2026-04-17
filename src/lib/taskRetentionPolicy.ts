/**
 * Product / ops constants for legacy `tasks` lifecycle and server sync scope.
 *
 * - Server pulls use a rolling `assigned_date` window so Postgres and egress stay bounded.
 * - IndexedDB + Zustand merge overlay server rows onto existing local tasks, so rows
 *   older than the window are retained locally until the user clears site data.
 * - For long-term table size, plan a server-side **archival** pipeline: copy or move very
 *   old **completed** rows to `tasks_archive` (or cold storage), then delete from `tasks`
 *   so the live table stays small. Preserve or migrate `task_sessions` (FK) as part of that
 *   design. Tune age vs analytics needs.
 */

/**
 * Rolling server fetch by `assigned_date` (about one semester+; 90–180 days is enough for
 * most students). Older rows stay on device via IndexedDB until site data is cleared.
 */
export const TASKS_SERVER_SYNC_LOOKBACK_DAYS = 180;

/**
 * Soft guidance for a future archival job: completed tasks older than this are candidates
 * to move off the hot `tasks` table (not implemented in app yet).
 */
export const RECOMMENDED_COMPLETED_TASK_RETENTION_DAYS = 540;

// `daily_plans` / `daily_tasks`: for compliance purges, archive or delete by `plan_date`
// in batches (respect FK from daily_tasks → daily_plans). No app cron wired yet.
