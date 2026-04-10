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
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

type CreateSubscriptionResult =
  | {
      ok: true;
      keyId: string;
      subscriptionId: string;
      amountPaise: number;
    }
  | { ok: false; error: string };

type ActivateSubscriptionResult =
  | { ok: true; subscriptionId: string }
  | { ok: false; error: string };

export type PlanUpgradeQuote = {
  targetTier: SubscriptionTier;
  amountPaise: number;
  line: string;
  remainingDays: number;
};

export type VerifyPlanUpgradePaymentResult =
  | { ok: true }
  | { ok: true; warning: string }
  | { ok: false; error: string };

const RAZORPAY_PLAN_IDS: Record<SubscriptionTier, string> = {
  basic: process.env.RAZORPAY_PLAN_ID_BASIC ?? "plan_basic_placeholder",
  pro: process.env.RAZORPAY_PLAN_ID_PRO ?? "plan_SbOStQOx52JVpG",
  pro_max: process.env.RAZORPAY_PLAN_ID_PRO_MAX ?? "plan_promax_placeholder",
};

const TOTAL_BILLING_CYCLES = 12;
const TRIAL_DAYS = 3;

const RAZORPAY_ID_RE = /^[a-zA-Z0-9_]{14,30}$/;
const RAZORPAY_ORDER_ID_RE = /^order_[a-zA-Z0-9]+$/;
const HEX_SIGNATURE_RE = /^[a-f0-9]{64}$/;

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
    subscription_plan: "trial" | "monthly";
    subscription_tier: SubscriptionTier;
    subscription_start_date: string;
    subscription_end_date: string;
    razorpay_subscription_id: string;
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
): Promise<CreateSubscriptionResult> {
  if (!isValidTier(tier)) {
    return { ok: false, error: "Invalid subscription tier." };
  }

  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in to subscribe." };

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Payment system is not configured yet." };

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
  const planId = RAZORPAY_PLAN_IDS[tier];

  try {
    const razorpay = getRazorpayClient(config);
    const startAt = calculateTrialEnd(new Date());

    const created = (await (razorpay.subscriptions.create as unknown as (
      body: Record<string, unknown>,
    ) => Promise<{ id: string }>)({
      plan_id: planId,
      total_count: TOTAL_BILLING_CYCLES,
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
      },
    })) as { id: string };

    return {
      ok: true,
      keyId: config.keyId,
      subscriptionId: created.id,
      amountPaise: tierConfig.trialPricePaise,
    };
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
  try {
    const razorpay = getRazorpayClient(config);
    const sub = (await razorpay.subscriptions.fetch(subscriptionId)) as {
      id: string;
      notes?: Record<string, string>;
    };
    const ownerUserId = sub.notes?.kalnehi_user_id?.trim();
    if (ownerUserId !== userId) {
      return { ok: false, error: "Subscription does not belong to this account." };
    }
    const noteTier = sub.notes?.kalnehi_tier;
    if (isValidTier(noteTier)) tier = noteTier;
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
  const tierResolved: SubscriptionTier = isValidTier(rawTier) ? rawTier : "pro";
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
  const tierResolved: SubscriptionTier = isValidTier(rawTier) ? rawTier : "pro";
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

export async function addBonusCredits(
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
  } catch {
    return { ok: false, error: "Unable to verify payment." };
  }
}

// ---------------------------------------------------------------------------
// Plan upgrade (prorated one-time order + new Razorpay subscription)
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
  | { ok: true; keyId: string; orderId: string; amountPaise: number }
  | { ok: false; error: string };

export async function createPlanUpgradeOrder(
  targetTier: SubscriptionTier,
): Promise<CreatePlanUpgradeOrderResult> {
  if (!isValidTier(targetTier)) {
    return { ok: false, error: "Invalid plan." };
  }

  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Payment system is not configured yet." };

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
    const receipt = `up${Date.now()}`.slice(0, 40);
    const order = (await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        kalnehi_user_id: userId,
        kalnehi_kind: "plan_upgrade",
        kalnehi_from_tier: fromTier,
        kalnehi_to_tier: targetTier,
        kalnehi_expected_paise: String(amountPaise),
      },
    })) as { id: string };

    return {
      ok: true,
      keyId: config.keyId,
      orderId: order.id,
      amountPaise,
    };
  } catch (error) {
    return { ok: false, error: safeErrorMessage(error) };
  }
}

export async function verifyPlanUpgradePayment(params: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}): Promise<VerifyPlanUpgradePaymentResult> {
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
    if (order.notes?.kalnehi_kind !== "plan_upgrade") {
      return { ok: false, error: "Invalid order type." };
    }

    const rawTo = order.notes?.kalnehi_to_tier?.trim();
    if (!isValidTier(rawTo)) {
      return { ok: false, error: "Invalid upgrade target in order." };
    }
    const targetTier = rawTo;
    const rawFromNote = order.notes?.kalnehi_from_tier?.trim();
    const fromNoteTier: SubscriptionTier | null = isValidTier(rawFromNote) ? rawFromNote : null;

    const expectedPaiseNote = order.notes?.kalnehi_expected_paise?.trim() ?? "";
    const expectedFromOrder = Number(expectedPaiseNote);
    const orderAmt = Number(order.amount);
    const payAmt = Number(pay.amount);
    if (
      !Number.isFinite(expectedFromOrder) ||
      orderAmt !== expectedFromOrder ||
      payAmt !== expectedFromOrder
    ) {
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
    if (recomputed.amountPaise !== expectedFromOrder) {
      return {
        ok: false,
        error: "Pricing changed since checkout started. Refresh and try again.",
      };
    }

    const claim = await claimRazorpayPaymentId(userId, paymentId, PAYMENT_KIND_UPGRADE);
    if (claim === "duplicate") return { ok: true };
    if (claim === "error") {
      return { ok: false, error: "Unable to confirm payment. Try again or contact support." };
    }

    const cycleEnd = endIso ? new Date(endIso) : new Date();
    if (Number.isNaN(cycleEnd.getTime())) {
      await releaseRazorpayPaymentClaim(paymentId);
      return { ok: false, error: "Invalid billing period end date." };
    }
    const startAtSec = Math.floor(cycleEnd.getTime() / 1000);

    let newSubId: string | null = null;
    try {
      const created = (await (razorpay.subscriptions.create as unknown as (
        body: Record<string, unknown>,
      ) => Promise<{ id: string }>)({
        plan_id: RAZORPAY_PLAN_IDS[targetTier],
        total_count: TOTAL_BILLING_CYCLES,
        customer_notify: 1,
        start_at: startAtSec,
        notes: {
          kalnehi_user_id: userId,
          kalnehi_plan: "monthly",
          kalnehi_tier: targetTier,
        },
      })) as { id: string };
      newSubId = created.id;
    } catch (e) {
      await releaseRazorpayPaymentClaim(paymentId);
      return {
        ok: false,
        error: `Could not start your new subscription: ${safeErrorMessage(e)}`,
      };
    }

    const oldSubId = profile.razorpay_subscription_id?.trim() ?? "";

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("user_profiles")
      .update({
        subscription_tier: targetTier,
        razorpay_subscription_id: newSubId,
        updated_at: nowIso,
      })
      .eq("user_id", userId);

    if (updateErr) {
      try {
        await razorpay.subscriptions.cancel(newSubId, false);
      } catch {
        /* ignore */
      }
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
  } catch {
    return { ok: false, error: "Unable to verify payment." };
  }
}
