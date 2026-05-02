/**
 * PrepBrain Groq token budgets by subscription phase.
 * Welcome (3-day free trial): 60k — welcome_ai_tokens_used
 * Monthly Pro (Smart Plan): 2M — ai_tokens_used + ai_tokens_month
 * Bonus: bonus_ai_tokens_ledger (30-day pools)
 */

import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";

/** ~80% of limit — UI warning threshold. */
export const PREPBRAIN_USAGE_WARN_RATIO = 0.8;

export const WELCOME_AI_TOKEN_CAP = 60_000;
/** @deprecated paid trial removed; kept for backward compat of existing Razorpay trial subscribers */
export const PAID_TRIAL_AI_TOKEN_CAP = 500_000;
export const MONTHLY_AI_TOKEN_CAP = 2_000_000;

export const PREPBRAIN_LIMIT_MESSAGE_MONTHLY =
  "You have reached your monthly Mastermind token limit of 2 million. Your allowance refreshes on the same date each month as your Smart Plan started.";
export const PREPBRAIN_LIMIT_MESSAGE_WELCOME =
  `You have used all 60,000 Mastermind tokens included in your 3-day free trial. Upgrade to Smart Plan (${SMART_PLAN_MONTHLY_DISPLAY}/month) for 2 million tokens per month.`;
/** @deprecated paid trial removed */
export const PREPBRAIN_LIMIT_MESSAGE_PAID_TRIAL =
  `You have used all Mastermind tokens included in your trial. Upgrade to Smart Plan (${SMART_PLAN_MONTHLY_DISPLAY}/month) for 2 million tokens per month.`;

const MONTH_KEY_TZ = "Asia/Kolkata";

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

export type PrepBrainTokenRow = {
  ai_tokens_used: number | null;
  ai_tokens_month: string | null;
  welcome_ai_tokens_used?: number | null;
  paid_trial_ai_tokens_used?: number | null;
};

export type AiUsagePhase =
  | "welcome"
  | "paid_trial"
  | "monthly"
  | "none";

export function resolveAiUsagePhase(params: {
  hasPaidSubscriptionAccess: boolean;
  subscriptionStatus: string | null;
  welcomeTrialActive: boolean;
}): AiUsagePhase {
  const { hasPaidSubscriptionAccess, subscriptionStatus, welcomeTrialActive } = params;
  if (welcomeTrialActive && !hasPaidSubscriptionAccess) return "welcome";
  if (hasPaidSubscriptionAccess && subscriptionStatus === "trial") return "paid_trial";
  if (
    hasPaidSubscriptionAccess &&
    (subscriptionStatus === "active" || subscriptionStatus === "cancelled")
  ) {
    return "monthly";
  }
  return "none";
}

export function effectivePrepbrainTokensUsed(
  row: PrepBrainTokenRow,
  monthKey: string = prepbrainCalendarMonthKey(),
): number {
  const storedMonth = row.ai_tokens_month?.trim() ?? "";
  if (storedMonth !== monthKey) return 0;
  const n = row.ai_tokens_used ?? 0;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export type PrepBrainUsageTier = "pro";

export type PrepBrainUsagePayload = {
  used: number;
  limit: number;
  monthKey: string;
  tier: PrepBrainUsageTier;
  phase: AiUsagePhase;
  /** Base allowance for this phase (excludes bonus pools). */
  phaseCap?: number;
  /** Active bonus tokens from one-time purchases (30-day pools). */
  bonusRemaining?: number;
};

export function prepbrainLimitReachedMessage(phase: AiUsagePhase): string {
  switch (phase) {
    case "welcome":
      return PREPBRAIN_LIMIT_MESSAGE_WELCOME;
    case "paid_trial":
      return PREPBRAIN_LIMIT_MESSAGE_PAID_TRIAL;
    default:
      return PREPBRAIN_LIMIT_MESSAGE_MONTHLY;
  }
}

function normalizeUsed(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
}

/**
 * Returns cumulative tokens used this phase and the hard cap for the phase.
 */
export function getAiTokenBudgetForPhase(
  phase: AiUsagePhase,
  row: PrepBrainTokenRow,
  monthKey: string,
): { used: number; limit: number } {
  switch (phase) {
    case "welcome":
      return {
        used: normalizeUsed(row.welcome_ai_tokens_used),
        limit: WELCOME_AI_TOKEN_CAP,
      };
    case "paid_trial":
      return {
        used: normalizeUsed(row.paid_trial_ai_tokens_used),
        limit: PAID_TRIAL_AI_TOKEN_CAP,
      };
    case "monthly":
      return {
        used: effectivePrepbrainTokensUsed(row, monthKey),
        limit: MONTHLY_AI_TOKEN_CAP,
      };
    default:
      return { used: 0, limit: 0 };
  }
}

export function buildPrepbrainUsagePayload(
  phase: AiUsagePhase,
  row: PrepBrainTokenRow,
  monthKey: string = prepbrainCalendarMonthKey(),
): PrepBrainUsagePayload {
  const { used, limit } = getAiTokenBudgetForPhase(phase, row, monthKey);
  return {
    used,
    limit,
    monthKey,
    tier: "pro",
    phase,
  };
}

/** Monthly display: same 2M cap for Pro. */
export function prepbrainMonthlyTokenLimit(_tier?: string | null): number {
  return MONTHLY_AI_TOKEN_CAP;
}
