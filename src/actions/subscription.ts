"use server";

import crypto from "node:crypto";
import Razorpay from "razorpay";

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

const MONTHLY_PLAN_ID = "plan_SbOStQOx52JVpG";
const TOTAL_BILLING_CYCLES = 12;
const UPFRONT_AMOUNT_PAISE = 2100;
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

async function upsertProfileByUserId(
  userId: string,
  payload: {
    subscription_status: SubscriptionStatus;
    subscription_plan: "trial" | "monthly";
    subscription_start_date: string;
    subscription_end_date: string;
    razorpay_subscription_id: string;
  },
) {
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: checkErr } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (checkErr) return { ok: false as const, error: "Unable to update profile." };

  const patch = { ...payload, updated_at: new Date().toISOString() };

  if (existing?.id) {
    const { error } = await supabase
      .from("user_profiles")
      .update(patch)
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: "Unable to update profile." };
  } else {
    const { error } = await supabase.from("user_profiles").insert({
      user_id: userId,
      ...patch,
    });
    if (error) return { ok: false as const, error: "Unable to update profile." };
  }

  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Create subscription (idempotent — rejects if user already has active/trial)
// ---------------------------------------------------------------------------

export async function createRazorpayTrialSubscription(): Promise<CreateSubscriptionResult> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in to subscribe." };

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("subscription_status, subscription_end_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const st = existing.subscription_status;
    if (st === "trial" || st === "active") {
      const endDate = existing.subscription_end_date
        ? new Date(existing.subscription_end_date)
        : null;
      if (endDate && endDate.getTime() > Date.now()) {
        return { ok: false, error: "You already have an active subscription." };
      }
    }
  }

  try {
    const razorpay = getRazorpayClient(config);
    const startAt = calculateTrialEnd(new Date());

    const created = (await (razorpay.subscriptions.create as unknown as (
      body: Record<string, unknown>,
    ) => Promise<{ id: string }>)({
      plan_id: MONTHLY_PLAN_ID,
      total_count: TOTAL_BILLING_CYCLES,
      customer_notify: 1,
      start_at: Math.floor(startAt.getTime() / 1000),
      addons: [
        {
          item: {
            name: "3-Day Trial Access",
            amount: UPFRONT_AMOUNT_PAISE,
            currency: "INR",
          },
        },
      ],
      notes: {
        kalnehi_user_id: userId,
        kalnehi_plan: "monthly",
        kalnehi_trial_days: String(TRIAL_DAYS),
      },
    })) as { id: string };

    return {
      ok: true,
      keyId: config.keyId,
      subscriptionId: created.id,
      amountPaise: UPFRONT_AMOUNT_PAISE,
    };
  } catch (error) {
    return { ok: false, error: safeErrorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Activate after payment (timing-safe sig, ownership verification via notes)
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
  } catch {
    return { ok: false, error: "Unable to verify subscription ownership." };
  }

  const start = new Date();
  const trialEnd = calculateTrialEnd(start);
  const updated = await upsertProfileByUserId(userId, {
    subscription_status: "trial",
    subscription_plan: "trial",
    subscription_start_date: start.toISOString(),
    subscription_end_date: trialEnd.toISOString(),
    razorpay_subscription_id: subscriptionId,
  });
  if (!updated.ok) return updated;

  return { ok: true, subscriptionId };
}

// ---------------------------------------------------------------------------
// Cancel subscription (server-side only, verified ownership)
// ---------------------------------------------------------------------------

export async function cancelSubscription(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Please sign in again." };

  const config = getRazorpayConfig();
  if (!config) return { ok: false, error: "Payment system is not configured yet." };

  const supabase = await createSupabaseServerClient();
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("subscription_status, razorpay_subscription_id")
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
  const { error: updateErr } = await supabase
    .from("user_profiles")
    .update({
      subscription_status: "cancelled",
      subscription_end_date: nowIso,
      updated_at: nowIso,
    })
    .eq("user_id", userId);
  if (updateErr) return { ok: false, error: "Unable to update cancellation." };

  return { ok: true };
}
