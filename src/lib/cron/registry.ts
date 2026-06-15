/**
 * Cron job registry for the single-dispatcher model (`/api/cron/tick`).
 *
 * Replaces the per-job `crons` entries in `vercel.json`. A single GitHub Actions
 * workflow pings the dispatcher every 5 minutes; the dispatcher decides which
 * jobs are due (Redis-backed last-run tracking) and fans out to the existing
 * `/api/cron/*` handlers. This lets the project run on the Vercel Hobby tier,
 * which only permits once-per-day crons.
 *
 * All daily times are UTC (matching the previous `vercel.json` schedules; IST is
 * UTC+5:30). Interval jobs run every N minutes.
 */

export type IntervalJob = {
  id: string;
  /** Path (and query) of the existing handler to invoke. */
  path: string;
  /** Run when at least this many minutes have elapsed since the last run. */
  everyMinutes: number;
};

export type DailyJob = {
  id: string;
  path: string;
  /** Scheduled wall-clock time in UTC. */
  utcHour: number;
  utcMinute: number;
};

/**
 * Jobs that previously used sub-daily cron expressions (`*/5`, `*/15`, `*/30`,
 * hourly). The dispatcher fires them once per elapsed interval.
 */
export const INTERVAL_JOBS: readonly IntervalJob[] = [
  { id: "notification-worker", path: "/api/cron/notification-worker", everyMinutes: 5 },
  {
    id: "sweep-prepbrain-ai-token-reservations",
    path: "/api/cron/sweep-prepbrain-ai-token-reservations",
    everyMinutes: 15,
  },
  { id: "open-batches", path: "/api/cron/open-batches", everyMinutes: 15 },
  { id: "refresh-org-analytics", path: "/api/cron/refresh-org-analytics", everyMinutes: 15 },
  { id: "notification-sequences", path: "/api/cron/notification-sequences", everyMinutes: 30 },
  { id: "embed-user-context", path: "/api/cron/embed-user-context", everyMinutes: 60 },
] as const;

/**
 * Jobs that previously used once-per-day cron expressions. Fired on the first
 * tick at or after the scheduled UTC time, once per UTC calendar day.
 */
export const DAILY_JOBS: readonly DailyJob[] = [
  {
    id: "system-push-morning",
    path: "/api/cron/system-push?phase=morning&ist=0700",
    utcHour: 1,
    utcMinute: 30,
  },
  { id: "renew-org-subscriptions", path: "/api/cron/renew-org-subscriptions", utcHour: 2, utcMinute: 0 },
  {
    id: "refresh-leaderboard-snapshots",
    path: "/api/cron/refresh-leaderboard-snapshots",
    utcHour: 2,
    utcMinute: 15,
  },
  { id: "journey-rollups", path: "/api/cron/journey-rollups", utcHour: 3, utcMinute: 30 },
  { id: "notify-batch-faculty", path: "/api/cron/notify-batch-faculty", utcHour: 3, utcMinute: 30 },
  {
    id: "system-push-evening",
    path: "/api/cron/system-push?phase=evening&ist=2000",
    utcHour: 14,
    utcMinute: 30,
  },
  { id: "activate-trial-queue", path: "/api/cron/activate-trial-queue", utcHour: 18, utcMinute: 30 },
] as const;

/** Redis key holding the last-run marker for a job. */
export function lastRunKey(id: string): string {
  return `cron:lastrun:${id}`;
}

/**
 * Slack subtracted from an interval threshold so jitter in the 5-minute tick
 * cadence never pushes a job to the *next* tick. e.g. a 5-min job becomes due
 * after 4 minutes, so it reliably fires on every scheduled tick.
 */
const INTERVAL_TOLERANCE_MS = 60_000;

/**
 * Whether an interval job is due given the epoch-ms timestamp of its last run
 * (null if it has never run).
 */
export function isIntervalDue(
  job: IntervalJob,
  lastRunMs: number | null,
  nowMs: number,
): boolean {
  if (lastRunMs == null) return true;
  const threshold = job.everyMinutes * 60_000 - INTERVAL_TOLERANCE_MS;
  return nowMs - lastRunMs >= threshold;
}

/** UTC calendar date as `YYYY-MM-DD`. */
export function utcYmd(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Whether a daily job is due: the current UTC time is at/after its scheduled
 * time and it has not already run on the current UTC calendar day.
 */
export function isDailyDue(
  job: DailyJob,
  lastRunYmd: string | null,
  now: Date,
): boolean {
  const today = utcYmd(now);
  if (lastRunYmd === today) return false;
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const scheduledMinutes = job.utcHour * 60 + job.utcMinute;
  return nowMinutes >= scheduledMinutes;
}
