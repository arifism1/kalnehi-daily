import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { RAZORPAY_PAYMENT_OR_SUB_ID_RE } from "@/lib/razorpayIds";
import { firstOfCurrentMonthDateString } from "@/lib/subscriptionUsage";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;
const HANDLED_EVENTS = new Set([
  "subscription.charged",
  "subscription.cancelled",
  "payment.failed",
]);

type PlanType = "trial" | "monthly";
type TierType = "basic" | "pro" | "pro_max";
type ProfileUpdate = {
  subscription_status: "trial" | "active" | "expired" | "cancelled";
  subscription_plan: PlanType;
  subscription_tier?: TierType;
  subscription_start_date: string;
  subscription_end_date: string;
  razorpay_subscription_id: string;
  updated_at: string;
};

type WebhookEnvelope = {
  event?: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        current_start?: number;
        current_end?: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity?: {
        notes?: Record<string, string>;
        subscription_id?: string | null;
      };
    };
  };
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) return null;
  return { supabaseUrl, serviceRoleKey, webhookSecret };
}

function createAdminClient(config: { supabaseUrl: string; serviceRoleKey: string }) {
  return createClient<Database>(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function inferPlan(payload: WebhookEnvelope): PlanType {
  const fromSubscription = payload.payload?.subscription?.entity?.notes?.kalnehi_plan;
  const fromPayment = payload.payload?.payment?.entity?.notes?.kalnehi_plan;
  const plan = fromSubscription ?? fromPayment;
  return plan === "trial" ? "trial" : "monthly";
}

function inferTier(payload: WebhookEnvelope): TierType {
  const fromSub = payload.payload?.subscription?.entity?.notes?.kalnehi_tier;
  const fromPay = payload.payload?.payment?.entity?.notes?.kalnehi_tier;
  const raw = fromSub ?? fromPay;
  if (raw === "basic" || raw === "pro" || raw === "pro_max") return raw;
  return "pro";
}

function buildUpdateFromSubscription(payload: WebhookEnvelope): ProfileUpdate | null {
  const sub = payload.payload?.subscription?.entity;
  const subId = sub?.id?.trim();
  if (!subId || !RAZORPAY_PAYMENT_OR_SUB_ID_RE.test(subId)) return null;

  const plan = inferPlan(payload);
  const now = new Date();
  const currentStart = typeof sub?.current_start === "number" ? sub.current_start : null;
  const currentEnd = typeof sub?.current_end === "number" ? sub.current_end : null;
  const start = currentStart ? new Date(currentStart * 1000) : now;
  const end = currentEnd ? new Date(currentEnd * 1000) : new Date(now);
  if (!currentEnd) {
    if (plan === "trial") end.setDate(end.getDate() + 3);
    else end.setMonth(end.getMonth() + 1);
  }

  return {
    subscription_status: plan === "trial" ? "trial" : "active",
    subscription_plan: plan,
    subscription_start_date: start.toISOString(),
    subscription_end_date: end.toISOString(),
    razorpay_subscription_id: subId,
    updated_at: now.toISOString(),
  };
}

async function applyBySubscriptionId(
  supabase: ReturnType<typeof createAdminClient>,
  subscriptionId: string,
  patch: Record<string, unknown>,
) {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("user_profiles")
    .update({ ...patch, updated_at: nowIso })
    .eq("razorpay_subscription_id", subscriptionId);
  return !error;
}

async function applyByUserId(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  patch: Record<string, unknown>,
) {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("user_profiles")
    .update({ ...patch, updated_at: nowIso })
    .eq("user_id", userId);
  return !error;
}

function okResponse(extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, ...extra });
}

function errorResponse(status: number) {
  return NextResponse.json({ ok: false }, { status });
}

export async function POST(request: Request) {
  const env = getEnv();
  if (!env) return errorResponse(500);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) return errorResponse(413);

  const signature = request.headers.get("x-razorpay-signature")?.trim();
  if (!signature) return errorResponse(401);

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return errorResponse(413);

  if (!verifySignature(rawBody, signature, env.webhookSecret)) {
    return errorResponse(401);
  }

  let payload: WebhookEnvelope;
  try {
    payload = JSON.parse(rawBody) as WebhookEnvelope;
  } catch {
    return errorResponse(400);
  }

  const event = payload.event;
  if (!event || !HANDLED_EVENTS.has(event)) {
    return okResponse({ ignored: true });
  }

  const supabase = createAdminClient(env);
  const subscriptionEntity = payload.payload?.subscription?.entity;
  const subscriptionId = subscriptionEntity?.id?.trim() ?? null;
  const userIdFromNotes = (
    subscriptionEntity?.notes?.kalnehi_user_id ??
    payload.payload?.payment?.entity?.notes?.kalnehi_user_id
  )?.trim();

  if (subscriptionId && !RAZORPAY_PAYMENT_OR_SUB_ID_RE.test(subscriptionId)) {
    return errorResponse(400);
  }

  if (event === "subscription.charged") {
    const patch = buildUpdateFromSubscription(payload);
    if (!patch) return okResponse({ ignored: true });

    const effectivePatch: Record<string, unknown> = {
      ...patch,
      subscription_status: "active",
      subscription_plan: "monthly",
      subscription_tier: inferTier(payload),
      razorpay_subscription_id: subscriptionId ?? patch.razorpay_subscription_id,
    };

    let priorStatus: string | null = null;
    if (subscriptionId) {
      const { data: row } = await supabase
        .from("user_profiles")
        .select("subscription_status")
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      priorStatus = row?.subscription_status ?? null;
    } else if (userIdFromNotes) {
      const { data: row } = await supabase
        .from("user_profiles")
        .select("subscription_status")
        .eq("user_id", userIdFromNotes)
        .maybeSingle();
      priorStatus = row?.subscription_status ?? null;
    }

    if (priorStatus === "trial") {
      effectivePatch.photo_scans_used_this_month = 0;
      effectivePatch.voice_minutes_used_this_month = 0;
      effectivePatch.usage_reset_date = firstOfCurrentMonthDateString();
    }

    let updated = false;
    if (subscriptionId) {
      updated = await applyBySubscriptionId(supabase, subscriptionId, effectivePatch);
    }
    if (!updated && userIdFromNotes) {
      updated = await applyByUserId(supabase, userIdFromNotes, effectivePatch);
    }
    return okResponse({ updated });
  }

  if (event === "subscription.cancelled") {
    const patch: Record<string, unknown> = {
      subscription_status: "cancelled",
    };

    let updated = false;
    if (subscriptionId) {
      updated = await applyBySubscriptionId(supabase, subscriptionId, patch);
    }
    if (!updated && userIdFromNotes) {
      updated = await applyByUserId(supabase, userIdFromNotes, patch);
    }
    return okResponse({ updated });
  }

  if (event === "payment.failed") {
    const failedPaymentSubId =
      payload.payload?.payment?.entity?.subscription_id?.trim() ?? "";
    if (
      !failedPaymentSubId ||
      !RAZORPAY_PAYMENT_OR_SUB_ID_RE.test(failedPaymentSubId)
    ) {
      return okResponse({ ignored: true });
    }

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {
      subscription_status: "expired",
      subscription_end_date: nowIso,
    };

    const updated = await applyBySubscriptionId(supabase, failedPaymentSubId, patch);
    return okResponse({ updated });
  }

  return okResponse({ ignored: true });
}
