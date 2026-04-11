/** Monthly PrepBrain AI token caps (Groq total_tokens per user per calendar month). */
export const PREPBRAIN_TOKEN_LIMIT_PRO = 40_000;
export const PREPBRAIN_TOKEN_LIMIT_PRO_MAX = 80_000;

/** ~80% of limit — UI warning threshold. */
export const PREPBRAIN_USAGE_WARN_RATIO = 0.8;

export const PREPBRAIN_LIMIT_MESSAGE_PRO =
  "You've reached your monthly PrepBrain AI limit. Upgrade to Pro Max or wait until next month.";
export const PREPBRAIN_LIMIT_MESSAGE_PRO_MAX =
  "You've reached your monthly PrepBrain AI limit. Your allowance resets at the start of next month.";

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

export function prepbrainMonthlyTokenLimit(
  tier: string | null | undefined,
): number {
  if (tier === "pro_max") return PREPBRAIN_TOKEN_LIMIT_PRO_MAX;
  return PREPBRAIN_TOKEN_LIMIT_PRO;
}

export type PrepBrainTokenRow = {
  prepbrain_tokens_used: number | null;
  prepbrain_tokens_month: string | null;
};

/**
 * Effective tokens used for the current month (lazy month rollover without requiring cron).
 */
export function effectivePrepbrainTokensUsed(
  row: PrepBrainTokenRow,
  monthKey: string = prepbrainCalendarMonthKey(),
): number {
  const storedMonth = row.prepbrain_tokens_month?.trim() ?? "";
  if (storedMonth !== monthKey) return 0;
  const n = row.prepbrain_tokens_used ?? 0;
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

export function prepbrainLimitReachedMessage(tier: PrepBrainUsageTier): string {
  return tier === "pro_max"
    ? PREPBRAIN_LIMIT_MESSAGE_PRO_MAX
    : PREPBRAIN_LIMIT_MESSAGE_PRO;
}

export function buildPrepbrainUsagePayload(
  tier: string | null | undefined,
  row: PrepBrainTokenRow,
  monthKey: string = prepbrainCalendarMonthKey(),
): PrepBrainUsagePayload {
  const t = normalizePrepbrainTier(tier);
  return {
    used: effectivePrepbrainTokensUsed(row, monthKey),
    limit: prepbrainMonthlyTokenLimit(tier),
    monthKey,
    tier: t,
  };
}
