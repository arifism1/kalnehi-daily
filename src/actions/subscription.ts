"use server";

import crypto from "node:crypto";
import Razorpay from "razorpay";
import { revalidateTag } from "next/cache";

import {
  DAILY_CAP_STATUS_TAG,
  getNextMidnightInTz,
} from "@/lib/daily-trial-cap";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"];
import {
  addBonusPool,
  consumeFromBonusLedger,
  extendActiveBonusPoolsBy30Days,
  parseBonusLedger,
  pruneExpiredBonusLedger,
  totalActiveBonus,
} from "@/lib/bonusCreditsLedger";
import type { SubscriptionTier } from "@/lib/subscriptionTiers";
import {
  EXTRA_CREDITS_BY_ID,
  getPhotoScansLimit,
  getVoiceMinutesLimit,
  parseSubscriptionTier,
  TIERS,
} from "@/lib/subscriptionTiers";
import {
  FREE_TRIAL_PHOTO_CAP,
  FREE_TRIAL_VOICE_CAP_SECONDS,
  isFreeTrialWindowActive,
  isPaidSubscriptionAccess,
} from "@/lib/freeTrial";
import {
  coerceVoiceMinutesUsed,
  currentUsagePeriodStartDateString,
  needsUsagePeriodReset,
  istCalendarDateStringFromInstant,
} from "@/lib/subscriptionUsage";
import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";
import {
  AUTOPAY_MONTHS_MIN,
  clampAutopayMonths,
  DEFAULT_AUTOPAY_MONTHS,
} from "@/lib/autopayMonths";
import { RAZORPAY_PAYMENT_OR_SUB_ID_RE } from "@/lib/razorpayIds";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/site";

/**
 * Defense-in-depth CSRF check for payment Server Actions.
 * Mirrors assertSameOrigin() but throws (which Next.js converts to an error boundary)
 * since Server Actions cannot return a Response directly.
 * Requests without an Origin header (non-browser callers) are passed through.
 */
async function assertServerActionOrigin(): Promise<void> {
  const origin = (await headers()).get("origin");
  if (!origin) return;
  const allowed = new Set([SITE_URL, "http://localhost:3000", "http://localhost:3001"]);
  if (!allowed.has(origin)) throw new Error("Forbidden.");
}

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
      prefill: RazorpayCheckoutPrefill;
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

function razorpayPlanEnvVarName(_tier: SubscriptionTier): string {
  return "RAZORPAY_PLAN_ID_PRO";
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

function planNameHintsTier(_tier: SubscriptionTier, name: string): boolean {
  const n = name.toLowerCase();
  if (/\bpro\s*max\b|promax|basic\b/.test(n)) return false;
  return /\bpro\b|kalnehi/i.test(n);
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

/** Razorpay checkout.js contact prefill (reduces manual email/phone entry). */
export type RazorpayCheckoutPrefill = {
  email: string;
  contact?: string;
};

function buildRazorpayPrefill(
  userId: string,
  authEmail: string | null | undefined,
  phoneRaw: string | null | undefined,
): RazorpayCheckoutPrefill {
  const email =
    authEmail?.trim() ||
    `kalnehi+${userId.replace(/-/g, "").slice(0, 12)}@checkout.kalnehi.app`;
  const digits = phoneRaw?.replace(/\D/g, "") ?? "";
  let contact: string | undefined;
  if (digits.length >= 10) {
    contact = digits.slice(-10);
  }
  return contact ? { email, contact } : { email };
}

async function loadRazorpayPrefillForUser(userId: string): Promise<RazorpayCheckoutPrefill> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = getAdminClient();
  let phone: string | null = null;
  if (admin) {
    const { data } = await admin
      .from("user_profiles")
      .select("phone_number")
      .eq("user_id", userId)
      .maybeSingle();
    phone = data?.phone_number?.trim() ?? null;
  }
  return buildRazorpayPrefill(userId, user?.email, phone);
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

function isCheckoutTier(tier: unknown): tier is SubscriptionTier {
  return tier === "pro";
}

/** Razorpay subscription notes may still say basic/pro_max — store as Pro. */
function tierFromRazorpayNote(raw: string | undefined): SubscriptionTier {
  const t = raw?.trim().toLowerCase();
  if (t === "basic" || t === "pro_max" || t === "pro") return "pro";
  return "pro";
}

const PAYMENT_KIND_EXTRA = "extra_credits" as const;
const PAYMENT_KIND_UPGRADE = "plan_upgrade" as const;

async function claimRazorpayPaymentId(
  userId: string,
  paymentId: string,
  kind: typeof PAYMENT_KIND_EXTRA | typeof PAYMENT_KIND_UPGRADE,
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
    subscription_plan: "trial" | "monthly" | "annual";
    subscription_tier: SubscriptionTier;
    subscription_start_date: string;
    subscription_end_date: string;
    razorpay_subscription_id: string;
    subscription_autopay_months_total?: number | null;
    has_had_trial?: boolean;
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
  const { data } = await admin
    .from("user_profiles")
    .select("subscription_start_date")
    .eq("user_id", userId)
    .maybeSingle();
  const subStart =
    (data as { subscription_start_date?: string | null } | null)?.subscription_start_date ?? null;
  const periodStart =
    currentUsagePeriodStartDateString(subStart) ?? istCalendarDateStringFromInstant();
  const nowIso = new Date().toISOString();
  await admin
    .from("user_profiles")
    .update({
      photo_scans_used_this_month: 0,
      voice_minutes_used_this_month: 0,
      usage_reset_date: periodStart,
      updated_at: nowIso,
    })
    .eq("user_id", userId);
}

/** First monthly charge after paid trial — trial token pool does not carry over. */
async function clearPaidTrialAiTokenCounter(userId: string) {
  const admin = getAdminClient();
  if (!admin) return;
  await admin
    .from("user_profiles")
    .update({
      paid_trial_ai_tokens_used: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

const RESUBSCRIBE_GRACE_MS = 90 * 24 * 60 * 60 * 1000;

/** Merge snapshot bonus pools if user resubscribes within 90 days of cancellation. */
async function mergeResubscribeBonusesAfterMonthlyActivate(userId: string) {
  const admin = getAdminClient();
  if (!admin) return;
  const { data: prior, error } = await admin
    .from("user_profiles")
    .select(
      "subscription_cancelled_at, bonus_voice_minutes_ledger, bonus_ai_tokens_ledger, bonus_voice_minutes_ledger_at_cancel, bonus_ai_tokens_ledger_at_cancel",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !prior) return;

  const cancelledAt = prior.subscription_cancelled_at
    ? new Date(prior.subscription_cancelled_at as string)
    : null;
  const withinGrace =
    cancelledAt &&
    !Number.isNaN(cancelledAt.getTime()) &&
    Date.now() - cancelledAt.getTime() <= RESUBSCRIBE_GRACE_MS;

  const now = new Date();
  let vLed = parseBonusLedger(prior.bonus_voice_minutes_ledger);
  let aLed = parseBonusLedger(prior.bonus_ai_tokens_ledger);
  if (withinGrace) {
    vLed = [...vLed, ...parseBonusLedger(prior.bonus_voice_minutes_ledger_at_cancel)];
    aLed = [...aLed, ...parseBonusLedger(prior.bonus_ai_tokens_ledger_at_cancel)];
  }
  vLed = pruneExpiredBonusLedger(vLed, now);
  aLed = pruneExpiredBonusLedger(aLed, now);

  await admin
    .from("user_profiles")
    .update({
      bonus_voice_minutes_ledger: vLed,
      bonus_voice_minutes: totalActiveBonus(vLed, now),
      bonus_ai_tokens_ledger: aLed,
      bonus_ai_tokens: totalActiveBonus(aLed, now),
      subscription_cancelled_at: null,
      bonus_voice_minutes_ledger_at_cancel: null,
      bonus_ai_tokens_ledger_at_cancel: null,
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// Cancel subscription
// ---------------------------------------------------------------------------

export async function cancelSubscription(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await assertServerActionOrigin();
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  if (!userId) return { ok: false, error: "Please sign in again." };
  const userEmail = user?.email ?? null;

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Unable to process cancellation." };

  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .select(
      "subscription_status, subscription_end_date, razorpay_subscription_id, bonus_voice_minutes_ledger, bonus_ai_tokens_ledger",
    )
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
      subscription_cancelled_at: nowIso,
      bonus_voice_minutes_ledger_at_cancel: profile?.bonus_voice_minutes_ledger ?? [],
      bonus_ai_tokens_ledger_at_cancel: profile?.bonus_ai_tokens_ledger ?? [],
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

  // Send cancellation confirmation email (best-effort, non-fatal).
  const accessUntil = profile?.subscription_end_date;
  if (userEmail && accessUntil) {
    void (async () => {
      try {
        const { sendCancelledConfirmationEmail } = await import("@/lib/waitlist/notifications");
        await sendCancelledConfirmationEmail({ email: userEmail, accessUntil });
      } catch (e) {
        console.warn("[cancelSubscription] confirmation email failed", e instanceof Error ? e.message : e);
      }
    })();
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Usage tracking: increment counters (called server-side before AI actions)
// ---------------------------------------------------------------------------

type PaidProfilePhotoRow = {
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  subscription_start_date: string | null;
  photo_scans_used_this_month: number | null;
  bonus_photo_scans_ledger: unknown;
  usage_reset_date: string | null;
};

async function applyPaidPhotoScanUsage(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  userId: string,
  data: PaidProfilePhotoRow,
  now: Date,
): Promise<{ ok: true; used: number; limit: number } | { ok: false; error: string }> {
  const resetNeeded = needsUsagePeriodReset(
    data.usage_reset_date,
    data.subscription_start_date,
    now,
  );
  const currentUsed = resetNeeded ? 0 : (data.photo_scans_used_this_month ?? 0);
  const ledger = parseBonusLedger(data.bonus_photo_scans_ledger);

  const rawTier = data.subscription_tier;
  const tierResolved: SubscriptionTier = parseSubscriptionTier(rawTier) ?? "pro";
  const isTrial = data.subscription_status === "trial";
  const monthlyLimit = getPhotoScansLimit(tierResolved, isTrial);
  const periodStart =
    currentUsagePeriodStartDateString(data.subscription_start_date, now) ??
    istCalendarDateStringFromInstant(now);

  const { ledger: afterBonus, taken } = consumeFromBonusLedger(ledger, 1, now);
  if (taken === 1) {
    const bonusSum = totalActiveBonus(afterBonus, now);
    const patch: UserProfileUpdate = {
      bonus_photo_scans_ledger: afterBonus,
      bonus_photo_scans: bonusSum,
      updated_at: now.toISOString(),
    };
    if (resetNeeded) {
      patch.photo_scans_used_this_month = 0;
      patch.voice_minutes_used_this_month = 0;
      patch.usage_reset_date = periodStart;
    }
    const { error: updateErr } = await admin
      .from("user_profiles")
      .update(patch)
      .eq("user_id", userId);
    if (updateErr) return { ok: false, error: "Unable to update usage." };
    return { ok: true, used: currentUsed, limit: monthlyLimit + bonusSum };
  }

  if (currentUsed >= monthlyLimit) {
    return { ok: false, error: "Monthly usage limit reached for this feature." };
  }

  const bonusSum = totalActiveBonus(ledger, now);
  const patch: UserProfileUpdate = {
    photo_scans_used_this_month: currentUsed + 1,
    updated_at: now.toISOString(),
  };
  if (resetNeeded) {
    patch.voice_minutes_used_this_month = 0;
    patch.usage_reset_date = periodStart;
  }

  if (!resetNeeded) {
    const { data: updatedRow, error: updateErr } = await admin
      .from("user_profiles")
      .update(patch)
      .eq("user_id", userId)
      .eq("photo_scans_used_this_month", currentUsed)
      .select("id")
      .maybeSingle();
    if (updateErr) return { ok: false, error: "Unable to update usage." };
    if (!updatedRow) {
      return { ok: false, error: "Could not apply usage. Please try again." };
    }
  } else {
    const { error: updateErr } = await admin
      .from("user_profiles")
      .update(patch)
      .eq("user_id", userId);
    if (updateErr) return { ok: false, error: "Unable to update usage." };
  }

  return { ok: true, used: currentUsed + 1, limit: monthlyLimit + bonusSum };
}

function parseWelcomeUsageRpc(data: unknown): {
  ok: boolean;
  error?: string;
  used?: number;
  limit?: number;
} {
  if (data === null || data === undefined || typeof data !== "object") {
    return { ok: false, error: "Unable to update usage." };
  }
  const o = data as Record<string, unknown>;
  if (o.ok === true) {
    return {
      ok: true,
      used: typeof o.used === "number" ? o.used : undefined,
      limit: typeof o.limit === "number" ? o.limit : undefined,
    };
  }
  return {
    ok: false,
    error: typeof o.error === "string" ? o.error : "Unable to update usage.",
  };
}

type PaidProfileVoiceRow = {
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  subscription_start_date: string | null;
  /** PostgREST may return `numeric` as string. */
  voice_minutes_used_this_month: number | string | null;
  bonus_voice_minutes_ledger: unknown;
  usage_reset_date: string | null;
  photo_scans_used_this_month: number | null;
};

async function applyPaidVoiceMinuteUsage(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  userId: string,
  initialData: PaidProfileVoiceRow,
  now: Date,
  minutes: number,
): Promise<{ ok: true; used: number; limit: number } | { ok: false; error: string }> {
  let data: PaidProfileVoiceRow = initialData;

  for (let attempt = 0; attempt < 6; attempt++) {
    const resetNeeded = needsUsagePeriodReset(
      data.usage_reset_date,
      data.subscription_start_date,
      now,
    );
    const currentUsed = resetNeeded
      ? 0
      : coerceVoiceMinutesUsed(data.voice_minutes_used_this_month);
    const ledger = parseBonusLedger(data.bonus_voice_minutes_ledger);

    const rawTier = data.subscription_tier;
    const tierResolved: SubscriptionTier = parseSubscriptionTier(rawTier) ?? "pro";
    const isTrial = data.subscription_status === "trial";
    const monthlyLimit = getVoiceMinutesLimit(tierResolved, isTrial);
    const periodStart =
      currentUsagePeriodStartDateString(data.subscription_start_date, now) ??
      istCalendarDateStringFromInstant(now);

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
    const newVoiceUsed = currentUsed + fromMonthly;
    const patch: UserProfileUpdate = {
      bonus_voice_minutes_ledger: ledgerAfterBonus,
      bonus_voice_minutes: bonusSum,
      voice_minutes_used_this_month: newVoiceUsed,
      updated_at: now.toISOString(),
    };
    if (resetNeeded) {
      patch.photo_scans_used_this_month = 0;
      patch.usage_reset_date = periodStart;
    }

    let q = admin.from("user_profiles").update(patch).eq("user_id", userId);

    if (fromMonthly === 0 && takenFromBonus > 0) {
      q = q.eq("bonus_voice_minutes", totalActiveBonus(ledger, now));
    }

    if (resetNeeded) {
      const anchor = data.usage_reset_date;
      if (anchor == null || anchor === "") {
        q = q.is("usage_reset_date", null);
      } else {
        q = q.eq("usage_reset_date", anchor);
      }
    } else {
      const usedRaw = data.voice_minutes_used_this_month;
      if (usedRaw == null || usedRaw === "") {
        q = q.is("voice_minutes_used_this_month", null);
      } else {
        q = q.eq(
          "voice_minutes_used_this_month",
          coerceVoiceMinutesUsed(usedRaw),
        );
      }
    }

    const { data: updatedRow, error: updateErr } = await q
      .select("voice_minutes_used_this_month")
      .maybeSingle();

    if (!updateErr && updatedRow) {
      return {
        ok: true,
        used: coerceVoiceMinutesUsed(updatedRow.voice_minutes_used_this_month),
        limit: monthlyLimit + bonusSum,
      };
    }

    const { data: fresh, error: freshErr } = await admin
      .from("user_profiles")
      .select(
        "subscription_tier, subscription_status, subscription_end_date, subscription_start_date, voice_minutes_used_this_month, bonus_voice_minutes_ledger, usage_reset_date, photo_scans_used_this_month",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (freshErr || !fresh) {
      return { ok: false, error: "Unable to update usage." };
    }
    data = fresh as PaidProfileVoiceRow;
  }

  return { ok: false, error: "Could not apply usage. Please try again." };
}

/**
 * Non-blocking helper: inserts a trial_started referral_events row if the user
 * has a referral_source set on their profile. Never throws or awaits externally.
 */
async function logReferralTrialStartedIfNeeded(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
): Promise<void> {
  if (!admin) return;
  try {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("referral_source" as "user_id")
      .eq("user_id", userId)
      .maybeSingle();
    const code = (profile as { referral_source?: string | null } | null)?.referral_source;
    if (!code) return;
    await admin
      .from("referral_events" as never)
      .insert({
        code,
        user_id: userId,
        session_id: null,
        event_type: "trial_started",
        metadata: {},
      } as never);
  } catch (e) {
    console.warn("[logReferralTrialStartedIfNeeded] non-fatal:", e);
  }
}

/** Idempotent: starts the one-time 7-day welcome trial for eligible new accounts. */
export async function ensureFreeTrialStarted(): Promise<
  | { ok: true; started: boolean }
  | { ok: false; error: string }
  | { ok: false; error: "daily_cap_reached"; queued: boolean; queuedFor: string; resetsAt: string; hoursUntilReset: number; position: number; opensAt: string }
> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Service unavailable." };

  // Short-circuit: if trial is already recorded, skip the cap RPC entirely.
  const { data: profileCheck } = await admin
    .from("user_profiles")
    .select("has_used_free_trial")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileCheck?.has_used_free_trial) return { ok: true, started: false };

  // ── Daily cap check ──────────────────────────────────────────────────────
  // Read cap config directly (bypass cache so we always see the live value).
  const { data: configRow } = await admin
    .from("app_config")
    .select("daily_cap_enabled, daily_trial_cap, daily_cap_timezone")
    .limit(1)
    .maybeSingle();

  const capEnabled: boolean =
    (configRow as { daily_cap_enabled: boolean } | null)?.daily_cap_enabled ?? false;
  const dailyCap: number =
    (configRow as { daily_trial_cap: number } | null)?.daily_trial_cap ?? 2000;

  if (capEnabled) {
    const tz: string =
      (configRow as { daily_cap_timezone: string } | null)?.daily_cap_timezone ??
      "Asia/Kolkata";
    const resetsAt = getNextMidnightInTz(tz);
    const hoursUntilReset = Math.max(
      0,
      Math.round(((resetsAt.getTime() - Date.now()) / (1000 * 60 * 60)) * 10) / 10,
    );

    const { data: rpcResult, error: rpcErr } = await admin.rpc(
      "increment_daily_trial_count" as never,
      { p_user_id: userId } as never,
    );

    if (rpcErr) {
      console.error("[ensureFreeTrialStarted] RPC error:", rpcErr.message);
      return { ok: false, error: "Unable to start welcome trial." };
    }

    const rpc = rpcResult as { ok: boolean; spots_remaining?: number; error?: string } | null;

    if (!rpc?.ok) {
      // Invalidate cache so UI immediately reflects full cap.
      revalidateTag(DAILY_CAP_STATUS_TAG, { expire: 0 });

      // Log the cap-hit event.
      void admin
        .from("feature_events")
        .insert({
          user_id: userId,
          feature: "trial_cap",
          event: "trial_cap_hit",
          metadata: {
            resetsAt: resetsAt.toISOString(),
            hoursUntilReset,
            spots_remaining: rpc?.spots_remaining ?? 0,
          },
        })
        .then(({ error: e }) => {
          if (e) console.warn("[ensureFreeTrialStarted] feature_events insert:", e.message);
        });

      // Enqueue for the next available free-trial slot (idempotent — safe to call multiple times).
      let queuedFor: string = resetsAt.toISOString().slice(0, 10); // fallback: tomorrow ISO date
      let position = 1;
      let newlyInserted = false;
      try {
        const { data: queueResult } = await admin.rpc(
          "join_trial_queue" as never,
          { p_user_id: userId } as never,
        );
        const qr = queueResult as {
          ok: boolean;
          queued_for?: string;
          position?: number;
          newly_inserted?: boolean;
        } | null;
        if (qr?.ok) {
          if (qr.queued_for) queuedFor = qr.queued_for;
          if (typeof qr.position === "number") position = qr.position;
          newlyInserted = qr.newly_inserted ?? false;
        }
      } catch (e) {
        console.warn("[ensureFreeTrialStarted] join_trial_queue failed (non-fatal):", e);
      }

      // opensAt = midnight IST on the queued_for date (cron fires at 18:30 UTC = 00:00 IST).
      const opensAt = `${queuedFor}T00:00:00+05:30`;

      // Send a one-time confirmation email with the exact trial start date.
      if (newlyInserted) {
        try {
          const { sendTrialQueuedEmail } = await import("@/lib/waitlist/notifications");
          const { data: authUser } = await admin.auth.admin.getUserById(userId);
          const email = authUser?.user?.email ?? null;
          if (email) {
            void sendTrialQueuedEmail({ email, trialStartsAt: opensAt, position, dailyCap });
          }
        } catch (e) {
          console.warn("[ensureFreeTrialStarted] queued email failed (non-fatal):", e);
        }
      }

      return {
        ok: false,
        error: "daily_cap_reached",
        queued: true,
        queuedFor,
        resetsAt: resetsAt.toISOString(),
        hoursUntilReset,
        position,
        opensAt,
      };
    }

    // Cap check passed — proceed with trial start.
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from("user_profiles")
      .update({
        trial_started_at: nowIso,
        has_used_free_trial: true,
        has_had_trial: true,
        updated_at: nowIso,
        // trial_access_type and trial_date are already set by the RPC.
      })
      .eq("user_id", userId)
      .eq("has_used_free_trial", false)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, error: "Unable to start welcome trial." };

    revalidateTag(DAILY_CAP_STATUS_TAG, { expire: 0 });

    // Log successful cap-gated trial start.
    void admin
      .from("feature_events")
      .insert({
        user_id: userId,
        feature: "trial_cap",
        event: "trial_started_daily_cap",
        metadata: {
          date: new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()),
          spots_remaining_after: rpc?.spots_remaining ?? 0,
        },
      })
      .then(({ error: e }) => {
        if (e) console.warn("[ensureFreeTrialStarted] feature_events insert:", e.message);
      });

    // Non-blocking referral funnel event — only fires if user has a referral_source.
    void logReferralTrialStartedIfNeeded(admin, userId);

    return { ok: true, started: !!data };
  }
  // ── Cap disabled — original flow ─────────────────────────────────────────

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("user_profiles")
    .update({
      trial_started_at: nowIso,
      has_used_free_trial: true,
      has_had_trial: true,
      updated_at: nowIso,
    })
    .eq("user_id", userId)
    .eq("has_used_free_trial", false)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "Unable to start welcome trial." };

  // Non-blocking referral funnel event — only fires if user has a referral_source.
  void logReferralTrialStartedIfNeeded(admin, userId);

  return { ok: true, started: !!data };
}

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
      "subscription_tier, subscription_status, subscription_end_date, subscription_start_date, payment_grace_until, photo_scans_used_this_month, bonus_photo_scans_ledger, usage_reset_date, trial_started_at, trial_photo_scans_used, has_used_free_trial",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to check usage." };

  const now = new Date();

  if (
    isPaidSubscriptionAccess(
      data.subscription_status ?? undefined,
      data.subscription_end_date ?? undefined,
      (data as { payment_grace_until?: string | null }).payment_grace_until ?? null,
    )
  ) {
    return applyPaidPhotoScanUsage(admin, userId, data, now);
  }

  const { data: rpcRaw, error: rpcErr } = await admin.rpc("consume_welcome_trial_photo_scan", {
    p_user_id: userId,
  });
  if (rpcErr) return { ok: false, error: "Unable to update usage." };

  const welcome = parseWelcomeUsageRpc(rpcRaw);
  if (welcome.ok) {
    return {
      ok: true,
      used: welcome.used ?? 0,
      limit: welcome.limit ?? FREE_TRIAL_PHOTO_CAP,
    };
  }

  if (welcome.error === "use_paid_path") {
    const { data: again, error: againErr } = await admin
      .from("user_profiles")
      .select(
        "subscription_tier, subscription_status, subscription_end_date, subscription_start_date, photo_scans_used_this_month, bonus_photo_scans_ledger, usage_reset_date",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (!againErr && again &&
      isPaidSubscriptionAccess(
        again.subscription_status ?? undefined,
        again.subscription_end_date ?? undefined,
        (again as { payment_grace_until?: string | null }).payment_grace_until ?? null,
      )) {
      return applyPaidPhotoScanUsage(admin, userId, again, now);
    }
  }

  return {
    ok: false,
    error:
      welcome.error && welcome.error !== "use_paid_path"
        ? welcome.error
        : "Unable to update usage.",
  };
}

/**
 * Read-only check before billable STT: same limits as {@link incrementVoiceMinuteUsage}
 * without writing. Pass an upper bound on minutes (e.g. from file-size estimate).
 */
export async function ensureVoiceMinuteHeadroom(
  minutes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const needMin = Math.max(0, minutes);
  if (needMin <= 0) return { ok: true };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Service unavailable." };

  const { data, error } = await admin
    .from("user_profiles")
    .select(
      "subscription_tier, subscription_status, subscription_end_date, subscription_start_date, payment_grace_until, voice_minutes_used_this_month, bonus_voice_minutes_ledger, usage_reset_date, trial_started_at, trial_voice_seconds_used",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to check usage." };

  const now = new Date();

  if (
    isPaidSubscriptionAccess(
      data.subscription_status ?? undefined,
      data.subscription_end_date ?? undefined,
      (data as { payment_grace_until?: string | null }).payment_grace_until ?? null,
    )
  ) {
    const resetNeeded = needsUsagePeriodReset(
      data.usage_reset_date,
      data.subscription_start_date ?? null,
      now,
    );
    const currentUsed = resetNeeded
      ? 0
      : coerceVoiceMinutesUsed(data.voice_minutes_used_this_month);
    const ledger = parseBonusLedger(data.bonus_voice_minutes_ledger);
    const tierResolved: SubscriptionTier =
      parseSubscriptionTier(data.subscription_tier) ?? "pro";
    const isTrial = data.subscription_status === "trial";
    const monthlyLimit = getVoiceMinutesLimit(tierResolved, isTrial);
    const { taken: takenFromBonus } = consumeFromBonusLedger(ledger, needMin, now);
    const fromMonthly = needMin - takenFromBonus;
    if (fromMonthly > 0 && currentUsed + fromMonthly > monthlyLimit) {
      return { ok: false, error: "Monthly voice minutes limit reached." };
    }
    return { ok: true };
  }

  if (!data.trial_started_at) {
    return {
      ok: false,
      error: "Start your 7-day free trial to use voice.",
    };
  }
  if (!isFreeTrialWindowActive(data.trial_started_at, now)) {
    return {
      ok: false,
      error: `Your 7-day free trial has ended. Subscribe to Smart Plan (${SMART_PLAN_MONTHLY_DISPLAY}/month) to continue.`,
    };
  }

  const addSec = Math.round(needMin * 60);
  if (addSec <= 0) return { ok: true };
  const used = Math.max(0, data.trial_voice_seconds_used ?? 0);
  if (used + addSec > FREE_TRIAL_VOICE_CAP_SECONDS) {
    return {
      ok: false,
      error:
        "You've used all 5 minutes of voice included in your 7-day free trial. Upgrade to Smart Plan for 100 minutes/month.",
    };
  }

  return { ok: true };
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
      "subscription_tier, subscription_status, subscription_end_date, subscription_start_date, payment_grace_until, voice_minutes_used_this_month, bonus_voice_minutes_ledger, usage_reset_date, photo_scans_used_this_month, trial_started_at, trial_voice_seconds_used, has_used_free_trial",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to check usage." };

  const now = new Date();

  if (
    isPaidSubscriptionAccess(
      data.subscription_status ?? undefined,
      data.subscription_end_date ?? undefined,
      (data as { payment_grace_until?: string | null }).payment_grace_until ?? null,
    )
  ) {
    return applyPaidVoiceMinuteUsage(admin, userId, data, now, minutes);
  }

  const addSec = Math.round(Math.max(0, minutes) * 60);
  const { data: rpcRaw, error: rpcErr } = await admin.rpc(
    "consume_welcome_trial_voice_seconds",
    {
      p_user_id: userId,
      p_add_seconds: addSec,
    },
  );
  if (rpcErr) return { ok: false, error: "Unable to check usage." };

  const welcome = parseWelcomeUsageRpc(rpcRaw);
  if (welcome.ok) {
    return {
      ok: true,
      used: welcome.used ?? 0,
      limit: welcome.limit ?? FREE_TRIAL_VOICE_CAP_SECONDS,
    };
  }

  if (welcome.error === "use_paid_path") {
    const { data: again, error: againErr } = await admin
      .from("user_profiles")
      .select(
        "subscription_tier, subscription_status, subscription_end_date, subscription_start_date, voice_minutes_used_this_month, bonus_voice_minutes_ledger, usage_reset_date, photo_scans_used_this_month",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (!againErr && again &&
      isPaidSubscriptionAccess(
        again.subscription_status ?? undefined,
        again.subscription_end_date ?? undefined,
        (again as { payment_grace_until?: string | null }).payment_grace_until ?? null,
      )) {
      return applyPaidVoiceMinuteUsage(admin, userId, again, now, minutes);
    }
  }

  return {
    ok: false,
    error:
      welcome.error && welcome.error !== "use_paid_path"
        ? welcome.error
        : "Unable to update usage.",
  };
}

// ---------------------------------------------------------------------------
// Extra credits purchase
// ---------------------------------------------------------------------------

async function addBonusCredits(
  type: "photo_scans" | "voice_minutes" | "ai_tokens" | "ai_study_partner",
  amount: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  if (type === "photo_scans") {
    if (amount < 1 || amount > 500) {
      return { ok: false, error: "Invalid credit amount." };
    }
  } else if (type === "voice_minutes") {
    if (amount < 1 || amount > 500) {
      return { ok: false, error: "Invalid credit amount." };
    }
  } else if (type === "ai_study_partner") {
    if (amount < 1 || amount > 1_000_000) {
      return { ok: false, error: "Invalid credit amount." };
    }
  } else {
    if (amount < 1 || amount > 10_000_000) {
      return { ok: false, error: "Invalid credit amount." };
    }
  }

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Service unavailable." };

  const { data, error } = await admin
    .from("user_profiles")
    .select("bonus_photo_scans_ledger, bonus_voice_minutes_ledger, bonus_ai_tokens_ledger")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to read profile." };

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);

  const patch: UserProfileUpdate = {
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
  } else if (type === "voice_minutes") {
    const ledger = addBonusPool(
      parseBonusLedger(data.bonus_voice_minutes_ledger),
      amount,
      expiresAt,
      now,
    );
    patch.bonus_voice_minutes_ledger = ledger;
    patch.bonus_voice_minutes = totalActiveBonus(ledger, now);
  } else if (type === "ai_study_partner") {
    // Uses a dedicated column + RPC; bypass ledger system entirely.
    const { error: rpcErr } = await admin.rpc("add_ai_study_partner_seconds", {
      p_user_id: userId,
      p_seconds: amount,
    });
    if (rpcErr) {
      console.error("[subscription] addBonusCredits ai_study_partner rpc error", rpcErr);
      return { ok: false, error: "Unable to add AI Study Partner credits." };
    }
    return { ok: true };
  } else {
    const ledger = addBonusPool(
      parseBonusLedger(data.bonus_ai_tokens_ledger),
      amount,
      expiresAt,
      now,
    );
    patch.bonus_ai_tokens_ledger = ledger;
    patch.bonus_ai_tokens = totalActiveBonus(ledger, now);
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
  | {
      ok: true;
      keyId: string;
      orderId: string;
      amountPaise: number;
      prefill: RazorpayCheckoutPrefill;
    }
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
    .select("subscription_status, subscription_end_date, phone_number")
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

  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabaseAuth.auth.getUser();
  const prefill = buildRazorpayPrefill(
    userId,
    authUser?.email,
    profile?.phone_number ?? null,
  );

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
      prefill,
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
  await assertServerActionOrigin();
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
// No-trial monthly subscription (for users who have already used their trial)
// ---------------------------------------------------------------------------
// Welcome-only users typically have no subscription_end_date — they can open checkout anytime.
// Razorpay-backed users on monthly AutoPay (`trial`/`active`, plan not annual/six_month) may
// replace their mandate early: cancel the existing Razorpay subscription, then create a new one.
// Upfront annual/six_month holders stay blocked here (use dedicated upfront flows / support).

export async function createRazorpayMonthlySubscription(
  tier: SubscriptionTier = "pro",
  autopayMonths?: unknown,
): Promise<CreateSubscriptionResult> {
  await assertServerActionOrigin();
  if (!isCheckoutTier(tier)) {
    return { ok: false, error: "Invalid subscription tier." };
  }

  const months = clampAutopayMonths(autopayMonths ?? DEFAULT_AUTOPAY_MONTHS);

  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in to subscribe." };

  const prefill = await loadRazorpayPrefillForUser(userId);

  const config = getRazorpayConfig();
  if (!config) {
    return {
      ok: false,
      error: "Payment system is not configured yet.",
      code: "payment_not_configured",
      debugHint: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment.",
    };
  }

  const admin = getAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "Payment system is not configured yet.",
      code: "payment_not_configured",
      debugHint: "Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.",
    };
  }

  const { data: existing } = await admin
    .from("user_profiles")
    .select("subscription_status, subscription_end_date, subscription_plan, razorpay_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const st = existing.subscription_status;
    const endDate = existing.subscription_end_date
      ? new Date(existing.subscription_end_date)
      : null;
    const stillHasAccess = !!(endDate && endDate.getTime() > Date.now());
    const plan = existing.subscription_plan?.trim() ?? "";
    const upfrontPlan = plan === "annual" || plan === "six_month";

    if ((st === "trial" || st === "active") && stillHasAccess) {
      if (upfrontPlan) {
        return { ok: false, error: "You already have an active subscription." };
      }
      const subscriptionId = existing.razorpay_subscription_id?.trim() ?? "";
      if (!subscriptionId || !RAZORPAY_ID_RE.test(subscriptionId)) {
        return { ok: false, error: "You already have an active subscription." };
      }
      try {
        const rzCancel = getRazorpayClient(config);
        await rzCancel.subscriptions.cancel(subscriptionId, false);
      } catch (error) {
        const msg = safeErrorMessage(error).toLowerCase();
        const benign =
          /already\s*cancel|subscription\s+already\s+cancel|inactive|invalid\s*subscription|not\s+found/.test(
            msg,
          );
        if (!benign) {
          return { ok: false, error: safeErrorMessage(error) };
        }
      }
    }
  }

  const tierConfig = TIERS[tier];

  try {
    const razorpay = getRazorpayClient(config);
    const hadEnvPlanId = Boolean(resolveRazorpayPlanId(tier));
    const resolved = await resolveRazorpayPlanIdWithApiFallback(razorpay, tier);
    if (!resolved.ok) {
      console.error(
        "[subscription] createRazorpayMonthlySubscription: missing or invalid Razorpay plan id",
        { tier, envVar: resolved.envVar, reason: resolved.reason },
      );
      const msg = planCheckoutFailureMessage(tier, resolved, "trial");
      return { ok: false, error: msg.error, code: msg.code, debugHint: msg.debugHint };
    }

    const startAt = new Date(Date.now() + MIN_SUBSCRIPTION_START_LEAD_SEC * 1000);
    const subscriptionCreateBody = {
      total_count: months,
      customer_notify: 1,
      start_at: Math.floor(startAt.getTime() / 1000),
      addons: [
        {
          item: {
            name: `${tierConfig.name} First Month`,
            amount: tierConfig.monthlyPricePaise,
            currency: "INR",
          },
        },
      ],
      notes: {
        kalnehi_user_id: userId,
        kalnehi_plan: "monthly",
        kalnehi_tier: tier,
        kalnehi_no_trial: "true",
        kalnehi_autopay_months: String(months),
      },
    };

    const createMonthly = (planId: string) =>
      (razorpay.subscriptions.create as unknown as (
        body: Record<string, unknown>,
      ) => Promise<{ id: string }>)({
        plan_id: planId,
        ...subscriptionCreateBody,
      });

    try {
      const created = await createMonthly(resolved.planId);
      return {
        ok: true,
        keyId: config.keyId,
        subscriptionId: created.id,
        amountPaise: tierConfig.monthlyPricePaise,
        prefill,
      };
    } catch (error) {
      if (hadEnvPlanId && isLikelyInvalidRazorpayPlanIdError(error)) {
        const fallback = await resolveRazorpayPlanIdWithApiFallback(razorpay, tier, {
          skipEnv: true,
        });
        if (fallback.ok && fallback.planId !== resolved.planId) {
          try {
            const created = await createMonthly(fallback.planId);
            console.warn("[subscription] createRazorpayMonthlySubscription: retried after invalid env plan id", {
              tier,
              fallbackPlanIdPrefix: fallback.planId.slice(0, 14),
            });
            return {
              ok: true,
              keyId: config.keyId,
              subscriptionId: created.id,
              amountPaise: tierConfig.monthlyPricePaise,
              prefill,
            };
          } catch (retryErr) {
            logRazorpaySubscriptionCreateFailure("createRazorpayMonthlySubscription (retry)", { tier }, retryErr);
            return { ok: false, error: safeErrorMessage(retryErr) };
          }
        }
      }
      logRazorpaySubscriptionCreateFailure("createRazorpayMonthlySubscription", { tier }, error);
      return { ok: false, error: safeErrorMessage(error) };
    }
  } catch (error) {
    return { ok: false, error: safeErrorMessage(error) };
  }
}

export async function activateRazorpayMonthlySubscription(params: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): Promise<ActivateSubscriptionResult> {
  await assertServerActionOrigin();
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
    if (sub.notes?.kalnehi_no_trial !== "true") {
      return { ok: false, error: "Invalid subscription type for this activation path." };
    }
    tier = tierFromRazorpayNote(sub.notes?.kalnehi_tier);
    autopayMonthsTotal = autopayMonthsFromSubscriptionEntity(sub);

    // Verify the payment is actually captured before activating.
    const paymentRecord = (await razorpay.payments.fetch(paymentId)) as { status?: string };
    if (paymentRecord.status !== "captured") {
      return { ok: false, error: "Payment has not been captured yet." };
    }
  } catch {
    return { ok: false, error: "Unable to verify subscription ownership." };
  }

  // Idempotency guard: prevent the same payment from activating the subscription twice
  // (e.g. double-tap on the checkout button or a client retry).
  const claimResult = await claimRazorpayPaymentId(userId, paymentId, PAYMENT_KIND_UPGRADE);
  if (claimResult === "duplicate") return { ok: true, subscriptionId };
  if (claimResult === "error") return { ok: false, error: "Unable to record payment. Please contact support." };

  const start = new Date();
  const monthEnd = new Date(start);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const updated = await upsertProfileByUserId(userId, {
    subscription_status: "active",
    subscription_plan: "monthly",
    subscription_tier: tier,
    subscription_start_date: start.toISOString(),
    subscription_end_date: monthEnd.toISOString(),
    razorpay_subscription_id: subscriptionId,
    subscription_autopay_months_total: autopayMonthsTotal,
    has_had_trial: true,
  });
  if (!updated.ok) {
    await releaseRazorpayPaymentClaim(paymentId);
    return updated;
  }

  await resetMonthlyAiUsageCounters(userId);
  await mergeResubscribeBonusesAfterMonthlyActivate(userId);

  return { ok: true, subscriptionId };
}

/**
 * Called from `POST /api/razorpay/webhook` on `payment.captured` after webhook signature verification.
 * Mirrors `activateRazorpayMonthlySubscription` profile updates without client-submitted HMAC
 * (trust comes from Razorpay signing the webhook + server-side payment/subscription fetch).
 */
export async function activateMonthlySubscriptionFromCapturedWebhookPayment(
  paymentId: string,
): Promise<{ ok: true; duplicate?: boolean; skipped?: boolean } | { ok: false; error: string }> {
  const trimmedPaymentId = paymentId?.trim() ?? "";
  if (!RAZORPAY_ID_RE.test(trimmedPaymentId)) {
    return { ok: false, error: "Invalid payment reference." };
  }

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const razorpay = getRazorpayClient(config);
  let subscriptionId = "";
  try {
    const paymentRecord = (await razorpay.payments.fetch(trimmedPaymentId)) as {
      status?: string;
      subscription_id?: string | null;
    };
    if (paymentRecord.status !== "captured") {
      // Payment was sent as captured but API disagrees — not an error we own.
      return { ok: true, skipped: true };
    }
    const sid =
      typeof paymentRecord.subscription_id === "string"
        ? paymentRecord.subscription_id.trim()
        : "";
    if (!sid || !RAZORPAY_ID_RE.test(sid)) {
      // Non-subscription payment (one-off order, etc.) — not ours to process.
      return { ok: true, skipped: true };
    }
    subscriptionId = sid;
  } catch {
    return { ok: false, error: "Unable to verify payment." };
  }

  let userId = "";
  let tier: SubscriptionTier = "pro";
  let autopayMonthsTotal: number | null = null;
  try {
    const sub = (await razorpay.subscriptions.fetch(subscriptionId)) as {
      id: string;
      notes?: Record<string, string>;
      total_count?: unknown;
    };
    userId = sub.notes?.kalnehi_user_id?.trim() ?? "";
    if (!userId) {
      // Subscription not created by this app — silently ignore.
      return { ok: true, skipped: true };
    }
    if (sub.notes?.kalnehi_no_trial !== "true") {
      // Legacy trial subscription or other type — let subscription.charged handle it.
      return { ok: true, skipped: true };
    }
    tier = tierFromRazorpayNote(sub.notes?.kalnehi_tier);
    autopayMonthsTotal = autopayMonthsFromSubscriptionEntity(sub);
  } catch {
    return { ok: false, error: "Unable to verify subscription." };
  }

  const claimResult = await claimRazorpayPaymentId(userId, trimmedPaymentId, PAYMENT_KIND_UPGRADE);
  if (claimResult === "duplicate") return { ok: true, duplicate: true };
  if (claimResult === "error") return { ok: false, error: "Unable to record payment." };

  const start = new Date();
  const monthEnd = new Date(start);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const updated = await upsertProfileByUserId(userId, {
    subscription_status: "active",
    subscription_plan: "monthly",
    subscription_tier: tier,
    subscription_start_date: start.toISOString(),
    subscription_end_date: monthEnd.toISOString(),
    razorpay_subscription_id: subscriptionId,
    subscription_autopay_months_total: autopayMonthsTotal,
    has_had_trial: true,
  });
  if (!updated.ok) {
    await releaseRazorpayPaymentClaim(trimmedPaymentId);
    return updated;
  }

  await resetMonthlyAiUsageCounters(userId);
  await mergeResubscribeBonusesAfterMonthlyActivate(userId);

  return { ok: true };
}

