/**
 * Shared AI token budget for PrepBrain and HelpyJi.
 * 2 million tokens per user per calendar month, shared across both features.
 */

/** ~80% of limit — UI warning threshold. */
export const PREPBRAIN_USAGE_WARN_RATIO = 0.8;

/** Shared monthly token cap — same for all paid tiers (Pro and Pro Max). */
export const PREPBRAIN_TOKEN_LIMIT_PRO = 2_000_000;
export const PREPBRAIN_TOKEN_LIMIT_PRO_MAX = 2_000_000;

export const PREPBRAIN_LIMIT_MESSAGE_PRO =
  "You have reached your monthly AI limit of 2 million tokens (shared between PrepBrain and HelpyJi). It will reset on the 1st of next month.";
export const PREPBRAIN_LIMIT_MESSAGE_PRO_MAX = PREPBRAIN_LIMIT_MESSAGE_PRO;

const MONTH_KEY_TZ = "Asia/Kolkata";

/**
 * Calendar month key for usage reset (1st of month in IST).
 * Matches product audience (India) and "resets on the 1st" expectation.
 */
export function prepbrainCalendarMonthKey(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: MONTH_KEY_TZ,
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${y}-${m}`;
}

/** Returns 2M for all paid tiers. */
export function prepbrainMonthlyTokenLimit(
  _tier?: string | null,
): number {
  return 2_000_000;
}

/**
 * Shared token row — backed by the `ai_tokens_used` / `ai_tokens_month`
 * columns in `user_profiles`. Both PrepBrain and HelpyJi read/write these.
 */
export type PrepBrainTokenRow = {
  ai_tokens_used: number | null;
  ai_tokens_month: string | null;
};

/**
 * Effective tokens used for the current month (lazy month rollover without
 * requiring the cron to have run yet at month start).
 */
export function effectivePrepbrainTokensUsed(
  row: PrepBrainTokenRow,
  monthKey: string = prepbrainCalendarMonthKey(),
): number {
  const storedMonth = row.ai_tokens_month?.trim() ?? "";
  if (storedMonth !== monthKey) return 0;
  const n = row.ai_tokens_used ?? 0;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export type PrepBrainUsageTier = "pro" | "pro_max";

export type PrepBrainUsagePayload = {
  used: number;
  limit: number;
  monthKey: string;
  tier: PrepBrainUsageTier;
};

function normalizePrepbrainTier(
  raw: string | null | undefined,
): PrepBrainUsageTier {
  return raw === "pro_max" ? "pro_max" : "pro";
}

export function prepbrainLimitReachedMessage(_tier?: PrepBrainUsageTier): string {
  return PREPBRAIN_LIMIT_MESSAGE_PRO;
}

export function buildPrepbrainUsagePayload(
  tier: string | null | undefined,
  row: PrepBrainTokenRow,
  monthKey: string = prepbrainCalendarMonthKey(),
): PrepBrainUsagePayload {
  const t = normalizePrepbrainTier(tier);
  return {
    used: effectivePrepbrainTokensUsed(row, monthKey),
    limit: 2_000_000,
    monthKey,
    tier: t,
  };
}
