"use server";

import crypto from "node:crypto";
import Razorpay from "razorpay";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { computeTierUpgradeProrationPaise, formatUpgradeProrationLabel } from "@/lib/billingProration";
import {
  addBonusPool,
  consumeFromBonusLedger,
  parseBonusLedger,
  totalActiveBonus,
} from "@/lib/bonusCreditsLedger";
import type { SubscriptionTier } from "@/lib/subscriptionTiers";
import {
  compareSubscriptionTiers,
  EXTRA_CREDITS_BY_ID,
  getPhotoScansLimit,
  getVoiceMinutesLimit,
  TIERS,
} from "@/lib/subscriptionTiers";
import {
  firstOfCurrentMonthDateString,
  needsMonthlyUsageReset,
} from "@/lib/subscriptionUsage";
import {
  AUTOPAY_MONTHS_MIN,
  clampAutopayMonths,
  DEFAULT_AUTOPAY_MONTHS,
} from "@/lib/autopayMonths";
import { RAZORPAY_PAYMENT_OR_SUB_ID_RE } from "@/lib/razorpayIds";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

/** Client-safe codes for pricing / upgrade checkout failures (no secrets). */
export type SubscriptionCheckoutErrorCode =
  | "payment_not_configured"
  | "plan_ambiguous"
  | "plan_not_found"
  | "plan_list_unavailable";

type CreateSubscriptionResult =
  | {
      ok: true;
      keyId: string;
      subscriptionId: string;
      amountPaise: number;
    }
  | {
      ok: false;
      error: string;
      code?: SubscriptionCheckoutErrorCode;
      /** Non-secret; for dev UI or support — never includes keys. */
      debugHint?: string;
    };

type ActivateSubscriptionResult =
  | { ok: true; subscriptionId: string }
  | { ok: false; error: string };

export type PlanUpgradeQuote = {
  targetTier: SubscriptionTier;
  amountPaise: number;
  line: string;
  remainingDays: number;
};

/** Result of verifying the single subscription Checkout (proration addon + recurring plan). */
export type VerifyPlanUpgradePaymentResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };


/** Legacy default for Razorpay fetches / upgrades when counts are missing. */
const AUTOPAY_FALLBACK_TOTAL_COUNT = 12;

const TRIAL_DAYS = 3;

async function getRemainingBillingCyclesForSubscription(
  razorpay: InstanceType<typeof Razorpay>,
  subscriptionId: string,
): Promise<number> {
  try {
    const sub = (await razorpay.subscriptions.fetch(subscriptionId)) as {
      remaining_count?: unknown;
      total_count?: unknown;
      paid_count?: unknown;
    };
    let remaining =
      typeof sub.remaining_count === "number" && Number.isFinite(sub.remaining_count)
        ? sub.remaining_count
        : Number.NaN;
    if (!Number.isFinite(remaining) || remaining < 0) {
      const total = typeof sub.total_count === "number" ? sub.total_count : Number.NaN;
      const paid = typeof sub.paid_count === "number" ? sub.paid_count : Number.NaN;
      if (Number.isFinite(total) && Number.isFinite(paid)) {
        remaining = Math.max(0, total - paid);
      }
    }
    if (!Number.isFinite(remaining) || remaining < 1) {
      console.error("[subscription] getRemainingBillingCyclesForSubscription: invalid counts, fallback", {
        subscriptionId: subscriptionId.slice(0, 14),
        remaining_count: sub.remaining_count,
        total_count: sub.total_count,
        paid_count: sub.paid_count,
      });
      return AUTOPAY_FALLBACK_TOTAL_COUNT;
    }
    return Math.trunc(remaining);
  } catch (e) {
    console.error("[subscription] getRemainingBillingCyclesForSubscription: fetch failed", {
      subscriptionId: subscriptionId.slice(0, 14),
      safeMessage: safeErrorMessage(e),
    });
    return AUTOPAY_FALLBACK_TOTAL_COUNT;
  }
}

function autopayMonthsFromSubscriptionEntity(sub: {
  notes?: Record<string, string>;
  total_count?: unknown;
}): number | null {
  const fromNote = Number.parseInt(sub.notes?.kalnehi_autopay_months?.trim() ?? "", 10);
  if (Number.isFinite(fromNote) && fromNote >= AUTOPAY_MONTHS_MIN) {
    return clampAutopayMonths(fromNote);
  }
  const tc = sub.total_count;
  if (typeof tc === "number" && Number.isFinite(tc) && tc >= AUTOPAY_MONTHS_MIN) {
    return clampAutopayMonths(tc);
  }
  return null;
}

const RAZORPAY_ID_RE = RAZORPAY_PAYMENT_OR_SUB_ID_RE;
/** Razorpay requires `start_at` far enough in the future on new subscriptions. */
const MIN_SUBSCRIPTION_START_LEAD_SEC = 900;
const RAZORPAY_ORDER_ID_RE = /^order_[a-zA-Z0-9]+$/;
const HEX_SIGNATURE_RE = /^[a-f0-9]{64}$/;

/** Razorpay dashboard plan id (test vs live must match API keys). */
const RAZORPAY_PLAN_ID_FORMAT_RE = /^plan_[A-Za-z0-9]+$/;

/** When `RAZORPAY_PLAN_ID_PRO` is unset, use this (legacy dev / deploys). */
const RAZORPAY_PLAN_ID_PRO_FALLBACK = "plan_SbOStQOx52JVpG";

function razorpayPlanEnvVarName(tier: SubscriptionTier): string {
  switch (tier) {
    case "basic":
      return "RAZORPAY_PLAN_ID_BASIC";
    case "pro":
      return "RAZORPAY_PLAN_ID_PRO";
    case "pro_max":
      return "RAZORPAY_PLAN_ID_PRO_MAX";
  }
}

/**
 * Env-only resolution. When this returns null, `resolveRazorpayPlanIdWithApiFallback` matches
 * a monthly INR plan by amount. Pro with empty env uses a dev-only legacy id when not in production.
 */
function resolveRazorpayPlanId(tier: SubscriptionTier): string | null {
  const envName = razorpayPlanEnvVarName(tier);
  const trimmed = process.env[envName]?.trim() ?? "";
  if (trimmed && RAZORPAY_PLAN_ID_FORMAT_RE.test(trimmed)) {
    return trimmed;
  }
  if (trimmed && !RAZORPAY_PLAN_ID_FORMAT_RE.test(trimmed)) {
    console.warn(
      `[subscription] ${envName} is set but invalid (expected Razorpay plan id like plan_xxx). Falling back to API amount match or Pro dev fallback.`,
    );
  }
  if (tier === "pro" && trimmed === "") {
    if (process.env.NODE_ENV === "production") {
      return null;
    }
    return RAZORPAY_PLAN_ID_FORMAT_RE.test(RAZORPAY_PLAN_ID_PRO_FALLBACK)
      ? RAZORPAY_PLAN_ID_PRO_FALLBACK
      : null;
  }
  return null;
}

type PlanResolveOutcome =
  | { ok: true; planId: string }
  | {
      ok: false;
      reason: "ambiguous" | "no_match" | "api_error";
      envVar: string;
      expectedPaise: number;
    };

type PlanListRow = {
  id?: string;
  item?: { amount?: number; currency?: string; name?: string };
  period?: string;
  created_at?: number;
};

type PlanCandidate = {
  id: string;
  name: string;
  createdAt: number;
};

/** Razorpay uses paise for INR; some dashboards mis-enter whole rupees (299 vs 29900). */
function monthlyInrAmountMatchesTier(amountRaw: number, currency: string, expectedPaise: number): boolean {
  if (!Number.isFinite(amountRaw)) return false;
  if (currency.toUpperCase() !== "INR") return false;
  if (amountRaw === expectedPaise) return true;
  if (amountRaw > 0 && amountRaw < 100000 && Number.isInteger(amountRaw)) {
    const asPaise = amountRaw * 100;
    if (asPaise === expectedPaise) return true;
  }
  return false;
}

function isMonthlyPlanPeriod(periodRaw: string): boolean {
  const period = periodRaw.trim().toLowerCase();
  return period === "monthly" || period === "month";
}

function planNameHintsTier(tier: SubscriptionTier, name: string): boolean {
  const n = name.toLowerCase();
  switch (tier) {
    case "pro_max":
      return /\bpro\s*max\b|promax|pro_max/.test(n);
    case "pro":
      if (/\bpro\s*max\b|promax|pro_max/.test(n)) return false;
      return /\bpro\b/.test(n);
    case "basic":
      if (/\bpro\s*max\b|promax/.test(n)) return false;
      if (/\bpro\b/.test(n) && !/\bbasic\b/.test(n)) return false;
      return true;
    default:
      return false;
  }
}

function dedupeCandidatesById(candidates: PlanCandidate[]): PlanCandidate[] {
  const seen = new Set<string>();
  const out: PlanCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

/**
 * When several monthly INR plans share the same price, prefer name hints, then newest plan.
 * Call only when `candidates.length > 0`.
 */
function pickPlanIdFromAmountMatches(
  tier: SubscriptionTier,
  candidates: PlanCandidate[],
  ctx: { envVar: string; expectedPaise: number },
): string {
  const unique = dedupeCandidatesById(candidates);
  if (unique.length === 1) return unique[0]!.id;

  const nameMatched = unique.filter((c) => planNameHintsTier(tier, c.name));
  const pool = nameMatched.length > 0 ? nameMatched : unique;
  if (pool.length === 1) {
    console.warn("[subscription] resolved duplicate plan price via tier name hint; pin with env", {
      tier,
      envVar: ctx.envVar,
      planIdPrefix: pool[0]!.id.slice(0, 14),
    });
    return pool[0]!.id;
  }

  pool.sort((a, b) => b.createdAt - a.createdAt);
  const chosen = pool[0]!;
  console.warn("[subscription] resolved duplicate plan price by newest created_at; set env to pin", {
    tier,
    envVar: ctx.envVar,
    expectedPaise: ctx.expectedPaise,
    count: pool.length,
    chosenIdPrefix: chosen.id.slice(0, 14),
  });
  return chosen.id;
}

function isLikelyInvalidRazorpayPlanIdError(error: unknown): boolean {
  const msg = safeErrorMessage(error).toLowerCase();
  if (!msg) return false;
  if (msg.includes("plan") && (msg.includes("does not exist") || msg.includes("invalid"))) return true;
  if (msg.includes("input_validation") && msg.includes("plan")) return true;
  if (msg.includes("no such") && msg.includes("plan")) return true;
  return false;
}

/**
 * When env plan ids are missing, resolve by matching the tier's monthly INR amount
 * against plans in the Razorpay account (same keys as checkout).
 */
async function resolveRazorpayPlanIdWithApiFallback(
  razorpay: InstanceType<typeof Razorpay>,
  tier: SubscriptionTier,
  options?: { skipEnv?: boolean },
): Promise<PlanResolveOutcome> {
  const envVar = razorpayPlanEnvVarName(tier);
  const fromEnv = options?.skipEnv ? null : resolveRazorpayPlanId(tier);
  if (fromEnv) return { ok: true, planId: fromEnv };

  const expectedPaise = TIERS[tier].monthlyPricePaise;
  try {
    const candidates: PlanCandidate[] = [];
    for (let skip = 0; skip < 1000; skip += 100) {
      const res = (await razorpay.plans.all({ count: 100, skip })) as {
        items?: PlanListRow[];
      };
      const plans = res.items ?? [];
      if (plans.length === 0) break;
      for (const p of plans) {
        const id = p.id?.trim();
        const amt = Number(p.item?.amount);
        const cur = (p.item?.currency ?? "INR").toUpperCase();
        const periodRaw = p.period ?? "";
        const name = (p.item?.name ?? "").trim();
        const createdAt =
          typeof p.created_at === "number" && Number.isFinite(p.created_at) ? p.created_at : 0;
        if (
          id &&
          RAZORPAY_PLAN_ID_FORMAT_RE.test(id) &&
          monthlyInrAmountMatchesTier(amt, cur, expectedPaise) &&
          isMonthlyPlanPeriod(periodRaw)
        ) {
          candidates.push({ id, name, createdAt });
        }
      }
    }
    if (candidates.length === 0) {
      return { ok: false, reason: "no_match", envVar, expectedPaise };
    }
    const planId = pickPlanIdFromAmountMatches(tier, candidates, { envVar, expectedPaise });
    return { ok: true, planId };
  } catch (e) {
    console.error("[subscription] resolveRazorpayPlanIdWithApiFallback: plans.all failed", {
      tier,
      safeMessage: safeErrorMessage(e),
    });
    return { ok: false, reason: "api_error", envVar, expectedPaise };
  }
  return { ok: false, reason: "no_match", envVar, expectedPaise };
}

function planCheckoutFailureMessage(
  tier: SubscriptionTier,
  failure: Extract<PlanResolveOutcome, { ok: false }>,
  context: "trial" | "upgrade",
): { error: string; code: SubscriptionCheckoutErrorCode; debugHint: string } {
  const { envVar, expectedPaise, reason } = failure;
  const tierDisplay = TIERS[tier].monthlyPriceDisplay;
  switch (reason) {
    case "ambiguous":
      return {
        error:
          context === "trial"
            ? "Checkout can’t start: more than one subscription plan in our billing account matches this price. Please contact support."
            : "Upgrade checkout can’t start: more than one subscription plan matches this price. Please contact support.",
        code: "plan_ambiguous",
        debugHint: `Several Razorpay plans match ${expectedPaise} paise/month. Set ${envVar} explicitly or remove duplicate plans in Razorpay.`,
      };
    case "api_error":
      return {
        error:
          "We couldn’t verify billing plans with the payment provider. Please try again in a few minutes.",
        code: "plan_list_unavailable",
        debugHint: "Razorpay plans list failed; verify RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET match the same mode (test vs live) as your dashboard.",
      };
    case "no_match":
      return {
        error:
          context === "trial"
            ? `Checkout can’t start: no monthly plan was found for ${tierDisplay}/month. Please contact support.`
            : `Upgrade can’t start: no monthly plan was found for this tier (${tierDisplay}/month). Please contact support.`,
        code: "plan_not_found",
        debugHint: `In Razorpay Dashboard create a monthly INR plan for ${expectedPaise} paise, or set ${envVar} to an existing plan id (Vercel → Production env).`,
      };
  }
}

function logRazorpaySubscriptionCreateFailure(
  context: string,
  ctx: Record<string, string | number | undefined>,
  error: unknown,
): void {
  const errRec =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const inner =
    errRec && typeof errRec.error === "object" && errRec.error !== null
      ? (errRec.error as Record<string, unknown>)
      : null;
  console.error(`[subscription] ${context}`, {
    ...ctx,
    safeMessage: safeErrorMessage(error),
    statusCode: errRec?.statusCode,
    errorCode: typeof inner?.code === "string" ? inner.code : undefined,
    errorDescription: typeof inner?.description === "string" ? inner.description : undefined,
    errorField: typeof inner?.field === "string" ? inner.field : undefined,
    errorSource: typeof inner?.source === "string" ? inner.source : undefined,
    rawMessage: error instanceof Error ? error.message : undefined,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthedUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

function getRazorpayClient(config: { keyId: string; keySecret: string }) {
  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.length > 200) return msg.slice(0, 200);
    return msg;
  }
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    const nested = obj.error;
    if (typeof nested === "object" && nested !== null) {
      const desc = (nested as Record<string, unknown>).description;
      if (typeof desc === "string") return desc.slice(0, 200);
    }
    if (typeof nested === "string") return nested.slice(0, 200);
    if (typeof obj.message === "string") return obj.message.slice(0, 200);
  }
  if (typeof error === "string") return error.slice(0, 200);
  return "Something went wrong. Please try again.";
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function calculateTrialEnd(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d;
}

function isValidTier(tier: unknown): tier is SubscriptionTier {
  return tier === "basic" || tier === "pro" || tier === "pro_max";
}

const PAYMENT_KIND_EXTRA = "extra_credits" as const;
const PAYMENT_KIND_UPGRADE = "plan_upgrade" as const;
const PAYMENT_KIND_UPGRADE_MANDATE = "plan_upgrade_mandate" as const;

async function claimRazorpayPaymentId(
  userId: string,
  paymentId: string,
  kind:
    | typeof PAYMENT_KIND_EXTRA
    | typeof PAYMENT_KIND_UPGRADE
    | typeof PAYMENT_KIND_UPGRADE_MANDATE,
): Promise<"new" | "duplicate" | "error"> {
  const admin = getAdminClient();
  if (!admin) return "error";
  const { error } = await admin.from("razorpay_processed_payments").insert({
    razorpay_payment_id: paymentId,
    user_id: userId,
    kind,
  });
  if (!error) return "new";
  if (error.code === "23505") return "duplicate";
  console.error("[subscription] payment idempotency insert failed:", error.code, error.message);
  return "error";
}

async function releaseRazorpayPaymentClaim(paymentId: string): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;
  await admin.from("razorpay_processed_payments").delete().eq("razorpay_payment_id", paymentId);
}

async function upsertProfileByUserId(
  userId: string,
  payload: {
    subscription_status: SubscriptionStatus;
    subscription_plan: "trial" | "monthly";
    subscription_tier: SubscriptionTier;
    subscription_start_date: string;
    subscription_end_date: string;
    razorpay_subscription_id: string;
    subscription_autopay_months_total?: number | null;
  },
) {
  const admin = getAdminClient();
  if (!admin) return { ok: false as const, error: "Unable to update profile." };

  const { data: existing, error: checkErr } = await admin
    .from("user_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (checkErr) return { ok: false as const, error: "Unable to update profile." };

  const patch = { ...payload, updated_at: new Date().toISOString() };

  if (existing?.id) {
    const { error } = await admin
      .from("user_profiles")
      .update(patch)
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: "Unable to update profile." };
  } else {
    const { error } = await admin.from("user_profiles").insert({
      user_id: userId,
      ...patch,
    });
    if (error) return { ok: false as const, error: "Unable to update profile." };
  }

  return { ok: true as const };
}

async function resetMonthlyAiUsageCounters(userId: string) {
  const admin = getAdminClient();
  if (!admin) return;
  const nowIso = new Date().toISOString();
  await admin
    .from("user_profiles")
    .update({
      photo_scans_used_this_month: 0,
      voice_minutes_used_this_month: 0,
      usage_reset_date: firstOfCurrentMonthDateString(),
      updated_at: nowIso,
    })
    .eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// Create subscription (supports all 3 tiers)
// ---------------------------------------------------------------------------

export async function createRazorpayTrialSubscription(
  tier: SubscriptionTier = "pro",
  autopayMonths?: unknown,
): Promise<CreateSubscriptionResult> {
  if (!isValidTier(tier)) {
    return { ok: false, error: "Invalid subscription tier." };
  }

  const months = clampAutopayMonths(autopayMonths ?? DEFAULT_AUTOPAY_MONTHS);

  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in to subscribe." };

  const config = getRazorpayConfig();
  if (!config) {
    return {
      ok: false,
      error: "Payment system is not configured yet.",
      code: "payment_not_configured",
      debugHint: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment (e.g. Vercel Production).",
    };
  }

  const admin = getAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "Payment system is not configured yet.",
      code: "payment_not_configured",
      debugHint:
        "Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL so billing can update profiles.",
    };
  }

  const { data: existing } = await admin
    .from("user_profiles")
    .select("subscription_status, subscription_end_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const st = existing.subscription_status;
    const endDate = existing.subscription_end_date
      ? new Date(existing.subscription_end_date)
      : null;
    const stillHasAccess = endDate && endDate.getTime() > Date.now();
    if ((st === "trial" || st === "active" || st === "cancelled") && stillHasAccess) {
      return { ok: false, error: "You already have an active subscription." };
    }
  }

  const tierConfig = TIERS[tier];

  try {
    const razorpay = getRazorpayClient(config);
    const hadEnvPlanId = Boolean(resolveRazorpayPlanId(tier));
    const resolved = await resolveRazorpayPlanIdWithApiFallback(razorpay, tier);
    if (!resolved.ok) {
      console.error(
        "[subscription] createRazorpayTrialSubscription: missing or invalid Razorpay plan id",
        { tier, envVar: resolved.envVar, reason: resolved.reason },
      );
      const msg = planCheckoutFailureMessage(tier, resolved, "trial");
      return {
        ok: false,
        error: msg.error,
        code: msg.code,
        debugHint: msg.debugHint,
      };
    }

    const startAt = calculateTrialEnd(new Date());
    const subscriptionCreateBody = {
      total_count: months,
      customer_notify: 1,
      start_at: Math.floor(startAt.getTime() / 1000),
      addons: [
        {
          item: {
            name: `${tierConfig.name} 3-Day Trial`,
            amount: tierConfig.trialPricePaise,
            currency: "INR",
          },
        },
      ],
      notes: {
        kalnehi_user_id: userId,
        kalnehi_plan: "monthly",
        kalnehi_tier: tier,
        kalnehi_trial_days: String(TRIAL_DAYS),
        kalnehi_autopay_months: String(months),
      },
    };

    const createTrial = (planId: string) =>
      (razorpay.subscriptions.create as unknown as (
        body: Record<string, unknown>,
      ) => Promise<{ id: string }>)({
        plan_id: planId,
        ...subscriptionCreateBody,
      });

    try {
      const created = await createTrial(resolved.planId);
      return {
        ok: true,
        keyId: config.keyId,
        subscriptionId: created.id,
        amountPaise: tierConfig.trialPricePaise,
      };
    } catch (error) {
      if (hadEnvPlanId && isLikelyInvalidRazorpayPlanIdError(error)) {
        const fallback = await resolveRazorpayPlanIdWithApiFallback(razorpay, tier, {
          skipEnv: true,
        });
        if (fallback.ok && fallback.planId !== resolved.planId) {
          try {
            const created = await createTrial(fallback.planId);
            console.warn("[subscription] createRazorpayTrialSubscription: retried after invalid env plan id", {
              tier,
              fallbackPlanIdPrefix: fallback.planId.slice(0, 14),
            });
            return {
              ok: true,
              keyId: config.keyId,
              subscriptionId: created.id,
              amountPaise: tierConfig.trialPricePaise,
            };
          } catch (retryErr) {
            logRazorpaySubscriptionCreateFailure("createRazorpayTrialSubscription (retry)", { tier }, retryErr);
            return { ok: false, error: safeErrorMessage(retryErr) };
          }
        }
      }
      logRazorpaySubscriptionCreateFailure("createRazorpayTrialSubscription", { tier }, error);
      return { ok: false, error: safeErrorMessage(error) };
    }
  } catch (error) {
    return { ok: false, error: safeErrorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Activate after payment
// ---------------------------------------------------------------------------

export async function activateRazorpaySubscription(params: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): Promise<ActivateSubscriptionResult> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Session expired. Please sign in again." };

  const paymentId = params.razorpay_payment_id?.trim() ?? "";
  const subscriptionId = params.razorpay_subscription_id?.trim() ?? "";
  const signature = params.razorpay_signature?.trim() ?? "";

  if (!RAZORPAY_ID_RE.test(paymentId)) {
    return { ok: false, error: "Invalid payment reference." };
  }
  if (!RAZORPAY_ID_RE.test(subscriptionId)) {
    return { ok: false, error: "Invalid subscription reference." };
  }
  if (!HEX_SIGNATURE_RE.test(signature)) {
    return { ok: false, error: "Invalid payment signature format." };
  }

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const expectedSignature = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");

  if (!timingSafeEqual(expectedSignature, signature)) {
    return { ok: false, error: "Payment verification failed." };
  }

  let tier: SubscriptionTier = "pro";
  let autopayMonthsTotal: number | null = null;
  try {
    const razorpay = getRazorpayClient(config);
    const sub = (await razorpay.subscriptions.fetch(subscriptionId)) as {
      id: string;
      notes?: Record<string, string>;
      total_count?: unknown;
    };
    const ownerUserId = sub.notes?.kalnehi_user_id?.trim();
    if (ownerUserId !== userId) {
      return { ok: false, error: "Subscription does not belong to this account." };
    }
    const noteTier = sub.notes?.kalnehi_tier;
    if (isValidTier(noteTier)) tier = noteTier;
    autopayMonthsTotal = autopayMonthsFromSubscriptionEntity(sub);
  } catch {
    return { ok: false, error: "Unable to verify subscription ownership." };
  }

  const start = new Date();
  const trialEnd = calculateTrialEnd(start);
  const updated = await upsertProfileByUserId(userId, {
    subscription_status: "trial",
    subscription_plan: "trial",
    subscription_tier: tier,
    subscription_start_date: start.toISOString(),
    subscription_end_date: trialEnd.toISOString(),
    razorpay_subscription_id: subscriptionId,
    subscription_autopay_months_total: autopayMonthsTotal,
  });
  if (!updated.ok) return updated;

  await resetMonthlyAiUsageCounters(userId);

  return { ok: true, subscriptionId };
}

// ---------------------------------------------------------------------------
// Cancel subscription
// ---------------------------------------------------------------------------

export async function cancelSubscription(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in again." };

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Unable to process cancellation." };

  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .select("subscription_status, subscription_end_date, razorpay_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileErr) return { ok: false, error: "Unable to read subscription." };

  const status = profile?.subscription_status;
  if (status !== "trial" && status !== "active") {
    return { ok: false, error: "No active subscription to cancel." };
  }

  const subscriptionId = profile?.razorpay_subscription_id?.trim() ?? "";
  if (!subscriptionId || !RAZORPAY_ID_RE.test(subscriptionId)) {
    return { ok: false, error: "No valid subscription found to cancel." };
  }

  try {
    const razorpay = getRazorpayClient(config);
    await razorpay.subscriptions.cancel(subscriptionId, false);
  } catch (error) {
    return { ok: false, error: safeErrorMessage(error) };
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("user_profiles")
    .update({
      subscription_status: "cancelled",
      updated_at: nowIso,
    })
    .eq("user_id", userId);

  if (updateErr) {
    const { data: recheck } = await admin
      .from("user_profiles")
      .select("subscription_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (recheck?.subscription_status === "cancelled") {
      return { ok: true };
    }

    console.error("[cancelSubscription] DB update failed:", updateErr);
    return { ok: false, error: "Unable to update cancellation." };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Usage tracking: increment counters (called server-side before AI actions)
// ---------------------------------------------------------------------------

export async function incrementPhotoScanUsage(): Promise<
  { ok: true; used: number; limit: number } | { ok: false; error: string }
> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Service unavailable." };

  const { data, error } = await admin
    .from("user_profiles")
    .select(
      "subscription_tier, subscription_status, photo_scans_used_this_month, bonus_photo_scans_ledger, usage_reset_date",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to check usage." };

  const resetNeeded = needsMonthlyUsageReset(data.usage_reset_date);
  const currentUsed = resetNeeded ? 0 : (data.photo_scans_used_this_month ?? 0);
  const now = new Date();
  const ledger = parseBonusLedger(data.bonus_photo_scans_ledger);

  const rawTier = data.subscription_tier;
  const tierResolved: SubscriptionTier = isValidTier(rawTier) ? rawTier : "basic";
  const isTrial = data.subscription_status === "trial";
  const monthlyLimit = getPhotoScansLimit(tierResolved, isTrial);

  const { ledger: afterBonus, taken } = consumeFromBonusLedger(ledger, 1, now);
  if (taken === 1) {
    const bonusSum = totalActiveBonus(afterBonus, now);
    const patch: Record<string, unknown> = {
      bonus_photo_scans_ledger: afterBonus,
      bonus_photo_scans: bonusSum,
      updated_at: now.toISOString(),
    };
    if (resetNeeded) {
      patch.photo_scans_used_this_month = 0;
      patch.voice_minutes_used_this_month = 0;
      patch.usage_reset_date = firstOfCurrentMonthDateString();
    }
    const { error: updateErr } = await admin
      .from("user_profiles")
      .update(patch)
      .eq("user_id", userId);
    if (updateErr) return { ok: false, error: "Unable to update usage." };
    return { ok: true, used: currentUsed, limit: monthlyLimit + bonusSum };
  }

  if (currentUsed >= monthlyLimit) {
    return { ok: false, error: "Monthly photo scan limit reached." };
  }

  const bonusSum = totalActiveBonus(ledger, now);
  const patch: Record<string, unknown> = {
    photo_scans_used_this_month: currentUsed + 1,
    updated_at: now.toISOString(),
  };
  if (resetNeeded) {
    patch.voice_minutes_used_this_month = 0;
    patch.usage_reset_date = firstOfCurrentMonthDateString();
  }

  const { error: updateErr } = await admin
    .from("user_profiles")
    .update(patch)
    .eq("user_id", userId);

  if (updateErr) return { ok: false, error: "Unable to update usage." };

  return { ok: true, used: currentUsed + 1, limit: monthlyLimit + bonusSum };
}

export async function incrementVoiceMinuteUsage(
  minutes: number = 1,
): Promise<
  { ok: true; used: number; limit: number } | { ok: false; error: string }
> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Service unavailable." };

  const { data, error } = await admin
    .from("user_profiles")
    .select(
      "subscription_tier, subscription_status, voice_minutes_used_this_month, bonus_voice_minutes_ledger, usage_reset_date",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to check usage." };

  const resetNeeded = needsMonthlyUsageReset(data.usage_reset_date);
  const currentUsed = resetNeeded ? 0 : (data.voice_minutes_used_this_month ?? 0);
  const now = new Date();
  const ledger = parseBonusLedger(data.bonus_voice_minutes_ledger);

  const rawTier = data.subscription_tier;
  const tierResolved: SubscriptionTier = isValidTier(rawTier) ? rawTier : "basic";
  const isTrial = data.subscription_status === "trial";
  const monthlyLimit = getVoiceMinutesLimit(tierResolved, isTrial);

  const { ledger: ledgerAfterBonus, taken: takenFromBonus } = consumeFromBonusLedger(
    ledger,
    minutes,
    now,
  );
  const fromMonthly = minutes - takenFromBonus;
  if (fromMonthly > 0 && currentUsed + fromMonthly > monthlyLimit) {
    return { ok: false, error: "Monthly voice minutes limit reached." };
  }

  const bonusSum = totalActiveBonus(ledgerAfterBonus, now);
  const patch: Record<string, unknown> = {
    bonus_voice_minutes_ledger: ledgerAfterBonus,
    bonus_voice_minutes: bonusSum,
    voice_minutes_used_this_month: currentUsed + fromMonthly,
    updated_at: now.toISOString(),
  };
  if (resetNeeded) {
    patch.photo_scans_used_this_month = 0;
    patch.usage_reset_date = firstOfCurrentMonthDateString();
  }

  const { error: updateErr } = await admin
    .from("user_profiles")
    .update(patch)
    .eq("user_id", userId);

  if (updateErr) return { ok: false, error: "Unable to update usage." };

  return {
    ok: true,
    used: currentUsed + fromMonthly,
    limit: monthlyLimit + bonusSum,
  };
}

// ---------------------------------------------------------------------------
// Extra credits purchase
// ---------------------------------------------------------------------------

async function addBonusCredits(
  type: "photo_scans" | "voice_minutes",
  amount: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  if (amount <= 0 || amount > 200) {
    return { ok: false, error: "Invalid credit amount." };
  }

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Service unavailable." };

  const { data, error } = await admin
    .from("user_profiles")
    .select("bonus_photo_scans_ledger, bonus_voice_minutes_ledger")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to read profile." };

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);

  const patch: Record<string, unknown> = {
    updated_at: now.toISOString(),
  };

  if (type === "photo_scans") {
    const ledger = addBonusPool(
      parseBonusLedger(data.bonus_photo_scans_ledger),
      amount,
      expiresAt,
      now,
    );
    patch.bonus_photo_scans_ledger = ledger;
    patch.bonus_photo_scans = totalActiveBonus(ledger, now);
  } else {
    const ledger = addBonusPool(
      parseBonusLedger(data.bonus_voice_minutes_ledger),
      amount,
      expiresAt,
      now,
    );
    patch.bonus_voice_minutes_ledger = ledger;
    patch.bonus_voice_minutes = totalActiveBonus(ledger, now);
  }

  const { error: updateErr } = await admin
    .from("user_profiles")
    .update(patch)
    .eq("user_id", userId);

  if (updateErr) return { ok: false, error: "Unable to add credits." };

  return { ok: true };
}

// ---------------------------------------------------------------------------
// One-time extra credits (Razorpay Order + Checkout)
// ---------------------------------------------------------------------------

type CreateExtraCreditsOrderResult =
  | { ok: true; keyId: string; orderId: string; amountPaise: number }
  | { ok: false; error: string };

export async function createExtraCreditsOrder(
  packId: string,
): Promise<CreateExtraCreditsOrderResult> {
  const pack = EXTRA_CREDITS_BY_ID[packId];
  if (!pack) return { ok: false, error: "Unknown credit pack." };

  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Payment system is not configured yet." };

  const { data: profile } = await admin
    .from("user_profiles")
    .select("subscription_status, subscription_end_date")
    .eq("user_id", userId)
    .maybeSingle();

  const st = profile?.subscription_status;
  const endDate = profile?.subscription_end_date
    ? new Date(profile.subscription_end_date)
    : null;
  const stillHasAccess = endDate && endDate.getTime() > Date.now();
  const paid =
    (st === "trial" || st === "active" || st === "cancelled") && stillHasAccess;
  if (!paid) {
    return { ok: false, error: "Subscribe to a plan before buying extra credits." };
  }

  try {
    const razorpay = getRazorpayClient(config);
    const receipt = `ec${Date.now()}`.slice(0, 40);
    const order = (await razorpay.orders.create({
      amount: pack.pricePaise,
      currency: "INR",
      receipt,
      notes: {
        kalnehi_user_id: userId,
        kalnehi_credit_pack: pack.id,
        kalnehi_credit_type: pack.type,
        kalnehi_credit_amount: String(pack.amount),
      },
    })) as { id: string };

    return {
      ok: true,
      keyId: config.keyId,
      orderId: order.id,
      amountPaise: pack.pricePaise,
    };
  } catch (error) {
    return { ok: false, error: safeErrorMessage(error) };
  }
}

type VerifyExtraCreditsResult = { ok: true } | { ok: false; error: string };

export async function verifyExtraCreditsPayment(params: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}): Promise<VerifyExtraCreditsResult> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Session expired. Please sign in again." };

  const paymentId = params.razorpay_payment_id?.trim() ?? "";
  const orderId = params.razorpay_order_id?.trim() ?? "";
  const signature = params.razorpay_signature?.trim() ?? "";

  if (!RAZORPAY_ID_RE.test(paymentId)) {
    return { ok: false, error: "Invalid payment reference." };
  }
  if (!RAZORPAY_ORDER_ID_RE.test(orderId)) {
    return { ok: false, error: "Invalid order reference." };
  }
  if (!HEX_SIGNATURE_RE.test(signature)) {
    return { ok: false, error: "Invalid payment signature format." };
  }

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const expectedSignature = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (!timingSafeEqual(expectedSignature, signature)) {
    return { ok: false, error: "Payment verification failed." };
  }

  try {
    const razorpay = getRazorpayClient(config);
    const order = (await razorpay.orders.fetch(orderId)) as {
      id?: string;
      status?: string;
      amount?: number;
      notes?: Record<string, string>;
    };
    const pay = (await razorpay.payments.fetch(paymentId)) as {
      status?: string;
      order_id?: string;
      amount?: number;
    };

    if (pay.order_id !== orderId) {
      return { ok: false, error: "Payment does not match this order." };
    }
    if (pay.status !== "captured") {
      return { ok: false, error: "Payment is not complete." };
    }

    const owner = order.notes?.kalnehi_user_id?.trim();
    if (owner !== userId) {
      return { ok: false, error: "Order does not belong to this account." };
    }

    const packId = order.notes?.kalnehi_credit_pack?.trim() ?? "";
    const pack = EXTRA_CREDITS_BY_ID[packId];
    if (!pack) {
      return { ok: false, error: "Invalid order metadata." };
    }
    const orderAmt = Number(order.amount);
    const payAmt = Number(pay.amount);
    if (orderAmt !== pack.pricePaise || payAmt !== pack.pricePaise) {
      return { ok: false, error: "Payment amount mismatch." };
    }

    const typeNote = order.notes?.kalnehi_credit_type;
    const amountNote = order.notes?.kalnehi_credit_amount;
    if (typeNote !== pack.type || amountNote !== String(pack.amount)) {
      return { ok: false, error: "Order metadata mismatch." };
    }

    const claim = await claimRazorpayPaymentId(userId, paymentId, PAYMENT_KIND_EXTRA);
    if (claim === "duplicate") return { ok: true };
    if (claim === "error") {
      return { ok: false, error: "Unable to confirm payment. Try again or contact support." };
    }

    const added = await addBonusCredits(pack.type, pack.amount);
    if (!added.ok) {
      await releaseRazorpayPaymentClaim(paymentId);
      return added;
    }
    return { ok: true };
  } catch (e) {
    console.error("[subscription] verifyExtraCreditsPayment: unexpected error", {
      safeMessage: safeErrorMessage(e),
    });
    return { ok: false, error: "Unable to verify payment." };
  }
}

// ---------------------------------------------------------------------------
// Plan upgrade (single Checkout: subscription + proration addon, like trial flow)
// ---------------------------------------------------------------------------

export async function getPlanUpgradeQuotes(): Promise<
  | { ok: true; quotes: PlanUpgradeQuote[] }
  | { ok: false; error: string }
> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Unable to load upgrade options." };

  const { data, error } = await admin
    .from("user_profiles")
    .select("subscription_tier, subscription_status, subscription_end_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to load profile." };

  const st = data.subscription_status;
  const endIso = data.subscription_end_date ?? null;
  const endDate = endIso ? new Date(endIso) : null;
  const stillHasAccess =
    endDate && !Number.isNaN(endDate.getTime()) && endDate.getTime() > Date.now();
  if (
    !stillHasAccess ||
    (st !== "trial" && st !== "active" && st !== "cancelled")
  ) {
    return { ok: true, quotes: [] };
  }

  const rawTier = data.subscription_tier;
  const fromTier: SubscriptionTier = isValidTier(rawTier) ? rawTier : "pro";
  const targets: SubscriptionTier[] =
    fromTier === "basic" ? ["pro", "pro_max"] : fromTier === "pro" ? ["pro_max"] : [];

  const quotes: PlanUpgradeQuote[] = [];
  for (const targetTier of targets) {
    const { remainingDays, amountPaise } = computeTierUpgradeProrationPaise(
      fromTier,
      targetTier,
      endIso,
    );
    if (amountPaise <= 0) continue;
    quotes.push({
      targetTier,
      amountPaise,
      remainingDays,
      line: formatUpgradeProrationLabel(amountPaise, remainingDays),
    });
  }

  return { ok: true, quotes };
}

type CreatePlanUpgradeOrderResult =
  | { ok: true; keyId: string; subscriptionId: string; amountPaise: number }
  | {
      ok: false;
      error: string;
      code?: SubscriptionCheckoutErrorCode;
      debugHint?: string;
    };

export async function createPlanUpgradeOrder(
  targetTier: SubscriptionTier,
): Promise<CreatePlanUpgradeOrderResult> {
  if (!isValidTier(targetTier)) {
    return { ok: false, error: "Invalid plan." };
  }

  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const config = getRazorpayConfig();
  if (!config) {
    return {
      ok: false,
      error: "Payment system is not configured yet.",
      code: "payment_not_configured",
      debugHint: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment (e.g. Vercel Production).",
    };
  }

  const admin = getAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "Payment system is not configured yet.",
      code: "payment_not_configured",
      debugHint:
        "Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL so billing can update profiles.",
    };
  }

  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .select(
      "subscription_tier, subscription_status, subscription_end_date, razorpay_subscription_id",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr || !profile) return { ok: false, error: "Unable to read subscription." };

  const st = profile.subscription_status;
  const endIso = profile.subscription_end_date ?? null;
  const endDate = endIso ? new Date(endIso) : null;
  const stillHasAccess =
    endDate && !Number.isNaN(endDate.getTime()) && endDate.getTime() > Date.now();
  if (
    !stillHasAccess ||
    (st !== "trial" && st !== "active" && st !== "cancelled")
  ) {
    return { ok: false, error: "You need an active subscription to upgrade." };
  }

  const rawTier = profile.subscription_tier;
  const fromTier: SubscriptionTier = isValidTier(rawTier) ? rawTier : "pro";
  if (compareSubscriptionTiers(targetTier, fromTier) <= 0) {
    return { ok: false, error: "Invalid upgrade path." };
  }

  const { amountPaise } = computeTierUpgradeProrationPaise(fromTier, targetTier, endIso);
  if (amountPaise <= 0) {
    return { ok: false, error: "Nothing to pay for this upgrade." };
  }

  try {
    const razorpay = getRazorpayClient(config);
    const hadEnvPlanId = Boolean(resolveRazorpayPlanId(targetTier));
    const resolved = await resolveRazorpayPlanIdWithApiFallback(razorpay, targetTier);
    if (!resolved.ok) {
      console.error(
        "[subscription] createPlanUpgradeOrder: could not resolve Razorpay plan id (env and plans list)",
        {
          targetTier,
          envVar: resolved.envVar,
          reason: resolved.reason,
          userIdPrefix: userId.slice(0, 8),
        },
      );
      const msg = planCheckoutFailureMessage(targetTier, resolved, "upgrade");
      return {
        ok: false,
        error: msg.error,
        code: msg.code,
        debugHint: msg.debugHint,
      };
    }

    const cycleEnd = endIso ? new Date(endIso) : new Date();
    if (Number.isNaN(cycleEnd.getTime())) {
      return { ok: false, error: "Invalid billing period end date." };
    }
    const cycleEndSec = Math.floor(cycleEnd.getTime() / 1000);
    const nowSec = Math.floor(Date.now() / 1000);
    const startAtSec = Math.max(cycleEndSec, nowSec + MIN_SUBSCRIPTION_START_LEAD_SEC);

    const fromName = TIERS[fromTier].name;
    const toName = TIERS[targetTier].name;

    const oldSubId = profile.razorpay_subscription_id?.trim() ?? "";
    let upgradeTotalCount = AUTOPAY_FALLBACK_TOTAL_COUNT;
    if (oldSubId && RAZORPAY_ID_RE.test(oldSubId)) {
      upgradeTotalCount = await getRemainingBillingCyclesForSubscription(razorpay, oldSubId);
    } else {
      console.error("[subscription] createPlanUpgradeOrder: missing razorpay_subscription_id, fallback total_count", {
        userIdPrefix: userId.slice(0, 8),
      });
    }

    const upgradeCreateBody = {
      total_count: upgradeTotalCount,
      customer_notify: 1,
      start_at: startAtSec,
      addons: [
        {
          item: {
            name: `${fromName} → ${toName} (prorated upgrade)`,
            amount: amountPaise,
            currency: "INR",
          },
        },
      ],
      notes: {
        kalnehi_user_id: userId,
        kalnehi_plan: "monthly",
        kalnehi_tier: targetTier,
        kalnehi_kind: "plan_upgrade",
        kalnehi_from_tier: fromTier,
        kalnehi_to_tier: targetTier,
        kalnehi_expected_addon_paise: String(amountPaise),
        kalnehi_autopay_months: String(upgradeTotalCount),
      },
    };

    const createUpgrade = (planId: string) =>
      (razorpay.subscriptions.create as unknown as (
        body: Record<string, unknown>,
      ) => Promise<{ id: string }>)({
        plan_id: planId,
        ...upgradeCreateBody,
      });

    try {
      const created = await createUpgrade(resolved.planId);
      return {
        ok: true,
        keyId: config.keyId,
        subscriptionId: created.id,
        amountPaise,
      };
    } catch (error) {
      if (hadEnvPlanId && isLikelyInvalidRazorpayPlanIdError(error)) {
        const fallback = await resolveRazorpayPlanIdWithApiFallback(razorpay, targetTier, {
          skipEnv: true,
        });
        if (fallback.ok && fallback.planId !== resolved.planId) {
          try {
            const created = await createUpgrade(fallback.planId);
            console.warn("[subscription] createPlanUpgradeOrder: retried after invalid env plan id", {
              targetTier,
              fallbackPlanIdPrefix: fallback.planId.slice(0, 14),
            });
            return {
              ok: true,
              keyId: config.keyId,
              subscriptionId: created.id,
              amountPaise,
            };
          } catch (retryErr) {
            logRazorpaySubscriptionCreateFailure(
              "createPlanUpgradeOrder (retry)",
              { targetTier, userIdPrefix: userId.slice(0, 8) },
              retryErr,
            );
            return { ok: false, error: safeErrorMessage(retryErr) };
          }
        }
      }
      logRazorpaySubscriptionCreateFailure(
        "createPlanUpgradeOrder",
        { targetTier, userIdPrefix: userId.slice(0, 8) },
        error,
      );
      return { ok: false, error: safeErrorMessage(error) };
    }
  } catch (error) {
    return { ok: false, error: safeErrorMessage(error) };
  }
}

export async function verifyPlanUpgradePayment(params: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): Promise<VerifyPlanUpgradePaymentResult> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Session expired. Please sign in again." };

  const paymentId = params.razorpay_payment_id?.trim() ?? "";
  const subscriptionId = params.razorpay_subscription_id?.trim() ?? "";
  const signature = params.razorpay_signature?.trim() ?? "";

  if (!RAZORPAY_ID_RE.test(paymentId)) {
    return { ok: false, error: "Invalid payment reference." };
  }
  if (!RAZORPAY_ID_RE.test(subscriptionId)) {
    return { ok: false, error: "Invalid subscription reference." };
  }
  if (!HEX_SIGNATURE_RE.test(signature)) {
    return { ok: false, error: "Invalid payment signature format." };
  }

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const expectedSignature = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");

  if (!timingSafeEqual(expectedSignature, signature)) {
    return { ok: false, error: "Payment verification failed." };
  }

  try {
    const razorpay = getRazorpayClient(config);
    const sub = (await razorpay.subscriptions.fetch(subscriptionId)) as {
      id?: string;
      notes?: Record<string, string>;
      current_start?: number | null;
      current_end?: number | null;
      total_count?: unknown;
    };

    const ownerUserId = sub.notes?.kalnehi_user_id?.trim();
    if (ownerUserId !== userId) {
      return { ok: false, error: "Subscription does not belong to this account." };
    }
    if (sub.notes?.kalnehi_kind !== "plan_upgrade") {
      return { ok: false, error: "Invalid subscription type." };
    }
    if (sub.notes?.kalnehi_plan !== "monthly") {
      return { ok: false, error: "Invalid subscription plan." };
    }

    const rawTo = sub.notes?.kalnehi_to_tier?.trim();
    if (!isValidTier(rawTo)) {
      return { ok: false, error: "Invalid upgrade target." };
    }
    const targetTier = rawTo;

    const rawFromNote = sub.notes?.kalnehi_from_tier?.trim();
    const fromNoteTier: SubscriptionTier | null = isValidTier(rawFromNote) ? rawFromNote : null;

    const expectedPaiseNote = sub.notes?.kalnehi_expected_addon_paise?.trim() ?? "";
    const expectedAddonPaise = Number(expectedPaiseNote);
    if (!Number.isFinite(expectedAddonPaise) || expectedAddonPaise <= 0) {
      return { ok: false, error: "Invalid upgrade pricing metadata." };
    }

    const pay = (await razorpay.payments.fetch(paymentId)) as {
      status?: string;
      amount?: number;
      subscription_id?: string | null;
    };

    if (pay.status !== "captured") {
      return { ok: false, error: "Payment is not complete." };
    }

    const paySubId = pay.subscription_id?.trim() ?? "";
    if (paySubId && paySubId !== subscriptionId) {
      console.error("[subscription] verifyPlanUpgradePayment: payment subscription_id mismatch after HMAC", {
        paymentId,
        subscriptionId,
        paySubId,
      });
      return { ok: false, error: "Payment does not match this subscription." };
    }

    const payAmt = Number(pay.amount);
    if (payAmt !== expectedAddonPaise) {
      return { ok: false, error: "Payment amount mismatch." };
    }

    const admin = getAdminClient();
    if (!admin) return { ok: false, error: "Unable to complete upgrade." };

    const { data: profile, error: profileErr } = await admin
      .from("user_profiles")
      .select(
        "subscription_tier, subscription_end_date, razorpay_subscription_id, subscription_status",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return { ok: false, error: "Unable to read subscription." };
    }

    const rawProfileTier = profile.subscription_tier;
    const currentTier: SubscriptionTier = isValidTier(rawProfileTier) ? rawProfileTier : "pro";
    if (fromNoteTier !== null && fromNoteTier !== currentTier) {
      return {
        ok: false,
        error: "Your plan changed since checkout started. Refresh and try again.",
      };
    }
    if (compareSubscriptionTiers(targetTier, currentTier) <= 0) {
      return { ok: false, error: "You are already on this tier or higher." };
    }

    const endIso = profile.subscription_end_date ?? null;
    const recomputed = computeTierUpgradeProrationPaise(currentTier, targetTier, endIso);
    if (recomputed.amountPaise !== expectedAddonPaise) {
      return {
        ok: false,
        error: "Pricing changed since checkout started. Refresh and try again.",
      };
    }

    const claim = await claimRazorpayPaymentId(userId, paymentId, PAYMENT_KIND_UPGRADE);
    if (claim === "duplicate") {
      const { data: resumeProfile } = await admin
        .from("user_profiles")
        .select("razorpay_subscription_id, subscription_tier")
        .eq("user_id", userId)
        .maybeSingle();
      const resumeSub = resumeProfile?.razorpay_subscription_id?.trim() ?? "";
      const resumeTierRaw = resumeProfile?.subscription_tier;
      if (
        resumeSub === subscriptionId &&
        isValidTier(resumeTierRaw) &&
        resumeTierRaw === targetTier
      ) {
        return { ok: true };
      }
      return { ok: true };
    }
    if (claim === "error") {
      return { ok: false, error: "Unable to confirm payment. Try again or contact support." };
    }

    const newSubId = subscriptionId;
    const oldSubId = profile.razorpay_subscription_id?.trim() ?? "";

    let subscriptionStartToStore = new Date().toISOString();
    let subscriptionEndToStore = endIso ?? new Date().toISOString();
    if (typeof sub.current_start === "number" && sub.current_start > 0) {
      subscriptionStartToStore = new Date(sub.current_start * 1000).toISOString();
    }
    if (typeof sub.current_end === "number" && sub.current_end > 0) {
      subscriptionEndToStore = new Date(sub.current_end * 1000).toISOString();
    }

    const autopayMonthsTotal = autopayMonthsFromSubscriptionEntity(sub);

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("user_profiles")
      .update({
        subscription_tier: targetTier,
        subscription_status: "active",
        razorpay_subscription_id: newSubId,
        subscription_plan: "monthly",
        subscription_start_date: subscriptionStartToStore,
        subscription_end_date: subscriptionEndToStore,
        ...(autopayMonthsTotal !== null
          ? { subscription_autopay_months_total: autopayMonthsTotal }
          : {}),
        updated_at: nowIso,
      })
      .eq("user_id", userId);

    if (updateErr) {
      await releaseRazorpayPaymentClaim(paymentId);
      return { ok: false, error: "Upgrade payment succeeded but we could not update your profile." };
    }

    if (oldSubId && RAZORPAY_ID_RE.test(oldSubId) && oldSubId !== newSubId) {
      try {
        await razorpay.subscriptions.cancel(oldSubId, false);
      } catch (e) {
        return {
          ok: true,
          warning: `Your plan was upgraded, but the previous Razorpay subscription could not be cancelled automatically (${safeErrorMessage(e)}). Please contact support with old id ${oldSubId}.`,
        };
      }
    }

    return { ok: true };
  } catch (e) {
    console.error("[subscription] verifyPlanUpgradePayment: unexpected error", {
      safeMessage: safeErrorMessage(e),
    });
    return { ok: false, error: "Unable to verify payment." };
  }
}

