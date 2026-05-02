/**
 * POST /api/annual-plan/verify
 * Verifies Razorpay payment for annual Smart Plan (₹3,591) and activates it.
 * Sets subscription_status = 'active', subscription_end_date = now + 365 days.
 */
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { SMART_PLAN_ANNUAL_PRICE_PAISE } from "@/lib/smartPlanPricing";
import { sendAnnualPlanActivatedEmail } from "@/lib/waitlist/notifications";

export const runtime = "nodejs";
const RAZORPAY_PAYMENT_ID_RE = /^pay_[a-zA-Z0-9]+$/;
const RAZORPAY_ORDER_ID_RE = /^order_[a-zA-Z0-9]+$/;
const HEX_SIGNATURE_RE = /^[a-f0-9]{64}$/;

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Session expired." }, { status: 401 });
  }

  let body: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const paymentId = (body.razorpay_payment_id ?? "").trim();
  const orderId = (body.razorpay_order_id ?? "").trim();
  const signature = (body.razorpay_signature ?? "").trim();

  if (!RAZORPAY_PAYMENT_ID_RE.test(paymentId) || !RAZORPAY_ORDER_ID_RE.test(orderId) || !HEX_SIGNATURE_RE.test(signature)) {
    return NextResponse.json({ ok: false, error: "Invalid payment reference." }, { status: 400 });
  }

  const config = getRazorpayConfig();
  if (!config) return NextResponse.json({ ok: false, error: "Payment not configured." }, { status: 503 });

  const expectedSig = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (!timingSafeEqual(expectedSig, signature)) {
    return NextResponse.json({ ok: false, error: "Payment verification failed." }, { status: 400 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });

  try {
    const razorpay = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });

    const order = (await razorpay.orders.fetch(orderId)) as {
      id?: string; amount?: number; notes?: Record<string, string>;
    };
    const payment = (await razorpay.payments.fetch(paymentId)) as {
      status?: string; order_id?: string; amount?: number;
    };

    if (payment.order_id !== orderId || payment.status !== "captured") {
      return NextResponse.json({ ok: false, error: "Payment not complete." }, { status: 400 });
    }
    if (Number(order.amount) !== SMART_PLAN_ANNUAL_PRICE_PAISE || Number(payment.amount) !== SMART_PLAN_ANNUAL_PRICE_PAISE) {
      return NextResponse.json({ ok: false, error: "Amount mismatch." }, { status: 400 });
    }
    if (order.notes?.kalnehi_user_id !== user.id || order.notes?.kalnehi_order_kind !== "annual_plan") {
      return NextResponse.json({ ok: false, error: "Order mismatch." }, { status: 403 });
    }

    // Idempotency.
    const { data: existing } = await admin
      .from("razorpay_processed_payments")
      .select("razorpay_payment_id")
      .eq("razorpay_payment_id", paymentId)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true, idempotent: true });

    const { error: insertErr } = await admin.from("razorpay_processed_payments").insert({
      razorpay_payment_id: paymentId,
      user_id: user.id,
      kind: "annual_plan",
    });
    if (insertErr?.code === "23505") return NextResponse.json({ ok: true, idempotent: true });
    if (insertErr) {
      console.error("[annual-plan/verify] payment claim insert failed", insertErr.message);
      return NextResponse.json({ ok: false, error: "Payment processing failed." }, { status: 500 });
    }

    // Best-effort: cancel existing monthly Razorpay subscription so the user
    // is not double-charged after upgrading to annual. Failure is non-fatal.
    let autopayWasCancelled = false;
    try {
      const { data: prof } = await admin
        .from("user_profiles")
        .select("razorpay_subscription_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const subId = (prof as { razorpay_subscription_id?: string | null } | null)
        ?.razorpay_subscription_id?.trim();
      if (subId && /^sub_[a-zA-Z0-9]+$/.test(subId)) {
        await razorpay.subscriptions.cancel(subId, false);
        autopayWasCancelled = true;
      }
    } catch (cancelErr) {
      console.warn("[annual-plan/verify] monthly subscription cancel failed (non-fatal)", cancelErr);
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Clear razorpay_subscription_id so stale subscription.cancelled / subscription.charged
    // webhooks from the old monthly sub cannot overwrite this annual plan.
    const { error: updateErr } = await admin.from("user_profiles").update({
      subscription_status: "active",
      subscription_plan: "annual",
      subscription_tier: "pro",
      subscription_start_date: now.toISOString(),
      subscription_end_date: endsAt,
      razorpay_subscription_id: null,
      ai_tokens_used: 0,
      ai_tokens_month: null,
      updated_at: now.toISOString(),
    }).eq("user_id", user.id);
    if (updateErr) {
      console.error("[annual-plan/verify] profile update failed after payment claim", updateErr.message);
      return NextResponse.json({ ok: false, error: "Payment recorded but access grant failed. Please contact support." }, { status: 500 });
    }

    // Send confirmation email (best-effort, non-fatal).
    if (user.email) {
      void sendAnnualPlanActivatedEmail({
        email: user.email,
        endsAt,
        autopayWasCancelled,
      }).catch((e) =>
        console.warn("[annual-plan/verify] confirmation email failed (non-fatal)", e instanceof Error ? e.message : e),
      );
    }

    return NextResponse.json({ ok: true, endsAt, autopayWasCancelled });
  } catch (e) {
    console.error("[annual-plan/verify] error", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "Payment processing failed." }, { status: 500 });
  }
}
