"use server";

import crypto from "node:crypto";
import Razorpay from "razorpay";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import type { SubscriptionTier } from "@/lib/subscriptionTiers";
import { TIERS } from "@/lib/subscriptionTiers";
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

const RAZORPAY_PLAN_IDS: Record<SubscriptionTier, string> = {
  basic: process.env.RAZORPAY_PLAN_ID_BASIC ?? "plan_basic_placeholder",
  pro: process.env.RAZORPAY_PLAN_ID_PRO ?? "plan_SbOStQOx52JVpG",
  pro_max: process.env.RAZORPAY_PLAN_ID_PRO_MAX ?? "plan_promax_placeholder",
};

const TOTAL_BILLING_CYCLES = 12;
const TRIAL_DAYS = 3;

const RAZORPAY_ID_RE = /^[a-zA-Z0-9_]{14,30}$/;
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
      "subscription_tier, photo_scans_used_this_month, bonus_photo_scans, usage_reset_date",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to check usage." };

  const resetNeeded = needsMonthlyReset(data.usage_reset_date);
  const currentUsed = resetNeeded ? 0 : (data.photo_scans_used_this_month ?? 0);
  const bonus = data.bonus_photo_scans ?? 0;

  const tierConfig = TIERS[data.subscription_tier as SubscriptionTier] ?? TIERS.pro;
  const totalLimit = tierConfig.photoScansPerMonth + bonus;

  if (currentUsed >= totalLimit) {
    return { ok: false, error: "Monthly photo scan limit reached." };
  }

  const patch: Record<string, unknown> = {
    photo_scans_used_this_month: currentUsed + 1,
    updated_at: new Date().toISOString(),
  };
  if (resetNeeded) {
    patch.voice_minutes_used_this_month = 0;
    patch.usage_reset_date = todayDateString();
  }

  const { error: updateErr } = await admin
    .from("user_profiles")
    .update(patch)
    .eq("user_id", userId);

  if (updateErr) return { ok: false, error: "Unable to update usage." };

  return { ok: true, used: currentUsed + 1, limit: totalLimit };
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
      "subscription_tier, voice_minutes_used_this_month, bonus_voice_minutes, usage_reset_date",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to check usage." };

  const resetNeeded = needsMonthlyReset(data.usage_reset_date);
  const currentUsed = resetNeeded ? 0 : (data.voice_minutes_used_this_month ?? 0);
  const bonus = data.bonus_voice_minutes ?? 0;

  const tierConfig = TIERS[data.subscription_tier as SubscriptionTier] ?? TIERS.pro;
  const totalLimit = tierConfig.voiceMinutesPerMonth + bonus;

  if (currentUsed + minutes > totalLimit) {
    return { ok: false, error: "Monthly voice minutes limit reached." };
  }

  const patch: Record<string, unknown> = {
    voice_minutes_used_this_month: currentUsed + minutes,
    updated_at: new Date().toISOString(),
  };
  if (resetNeeded) {
    patch.photo_scans_used_this_month = 0;
    patch.usage_reset_date = todayDateString();
  }

  const { error: updateErr } = await admin
    .from("user_profiles")
    .update(patch)
    .eq("user_id", userId);

  if (updateErr) return { ok: false, error: "Unable to update usage." };

  return { ok: true, used: currentUsed + minutes, limit: totalLimit };
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
    .select("bonus_photo_scans, bonus_voice_minutes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to read profile." };

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (type === "photo_scans") {
    patch.bonus_photo_scans = (data.bonus_photo_scans ?? 0) + amount;
  } else {
    patch.bonus_voice_minutes = (data.bonus_voice_minutes ?? 0) + amount;
  }

  const { error: updateErr } = await admin
    .from("user_profiles")
    .update(patch)
    .eq("user_id", userId);

  if (updateErr) return { ok: false, error: "Unable to add credits." };

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Monthly reset helper
// ---------------------------------------------------------------------------

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function needsMonthlyReset(lastResetDate: string | null): boolean {
  if (!lastResetDate) return true;
  const now = new Date();
  const last = new Date(lastResetDate);
  if (Number.isNaN(last.getTime())) return true;
  return now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
}
