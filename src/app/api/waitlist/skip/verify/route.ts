/**
 * POST /api/waitlist/skip/verify
 * Verifies a Razorpay payment for the ₹19 waitlist skip.
 * On success: calls activate_waitlist_skip RPC → sets trial_started_at.
 */
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { type NextRequest, NextResponse } from "next/server";

import { revalidateTag } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { DAILY_CAP_STATUS_TAG } from "@/lib/daily-trial-cap";

export const runtime = "nodejs";

const SKIP_PRICE_PAISE = 1900;
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
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Session expired." }, { status: 401 });
  }

  let body: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const paymentId = (body.razorpay_payment_id ?? "").trim();
  const orderId = (body.razorpay_order_id ?? "").trim();
  const signature = (body.razorpay_signature ?? "").trim();

  if (!RAZORPAY_PAYMENT_ID_RE.test(paymentId)) {
    return NextResponse.json({ ok: false, error: "Invalid payment reference." }, { status: 400 });
  }
  if (!RAZORPAY_ORDER_ID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid order reference." }, { status: 400 });
  }
  if (!HEX_SIGNATURE_RE.test(signature)) {
    return NextResponse.json({ ok: false, error: "Invalid payment signature." }, { status: 400 });
  }

  const config = getRazorpayConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: "Payment system not configured." }, { status: 503 });
  }

  // Verify HMAC signature.
  const expectedSignature = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (!timingSafeEqual(expectedSignature, signature)) {
    return NextResponse.json({ ok: false, error: "Payment verification failed." }, { status: 400 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  try {
    const razorpay = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });

    const order = (await razorpay.orders.fetch(orderId)) as {
      id?: string;
      status?: string;
      amount?: number;
      notes?: Record<string, string>;
    };
    const payment = (await razorpay.payments.fetch(paymentId)) as {
      status?: string;
      order_id?: string;
      amount?: number;
    };

    if (payment.order_id !== orderId) {
      return NextResponse.json({ ok: false, error: "Payment does not match this order." }, { status: 400 });
    }
    if (payment.status !== "captured") {
      return NextResponse.json({ ok: false, error: "Payment is not complete." }, { status: 400 });
    }

    // Verify amount.
    if (Number(order.amount) !== SKIP_PRICE_PAISE || Number(payment.amount) !== SKIP_PRICE_PAISE) {
      return NextResponse.json({ ok: false, error: "Payment amount mismatch." }, { status: 400 });
    }

    // Verify order belongs to this user.
    const owner = order.notes?.kalnehi_user_id?.trim();
    if (owner !== user.id) {
      return NextResponse.json({ ok: false, error: "Order does not belong to this account." }, { status: 403 });
    }

    // Verify kind.
    if (order.notes?.kalnehi_order_kind !== "waitlist_skip") {
      return NextResponse.json({ ok: false, error: "Invalid order metadata." }, { status: 400 });
    }

    // Call the RPC to activate skip + start trial.
    const { data: rpcResult, error: rpcErr } = await admin.rpc("activate_waitlist_skip", {
      p_user_id: user.id,
      p_razorpay_payment_id: paymentId,
    });

    if (rpcErr) {
      console.error("[waitlist/skip/verify] RPC error", rpcErr.message);
      return NextResponse.json({ ok: false, error: "Failed to activate skip." }, { status: 500 });
    }

    const result = rpcResult as { ok: boolean; error?: string; idempotent?: boolean; trial_started_at?: string };

    if (!result.ok) {
      if (result.error === "already_had_trial") {
        return NextResponse.json({
          ok: false,
          error: "You have already used a free trial.",
        }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: result.error ?? "Activation failed." }, { status: 400 });
    }

    // Mark the user as having used the paid skip path (bypasses daily cap).
    const todayIST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    await admin
      .from("user_profiles")
      .update({
        trial_access_type: "skip_paid",
        trial_date: todayIST,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("user_id", user.id);

    // Log analytics event.
    void admin
      .from("feature_events")
      .insert({
        user_id: user.id,
        feature: "trial_cap",
        event: "trial_cap_skip_paid",
        metadata: {
          razorpay_payment_id: paymentId,
          date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()),
        },
      } as never)
      .then(({ error: e }: { error: { message: string } | null }) => {
        if (e) console.warn("[waitlist/skip/verify] feature_events insert:", e.message);
      });

    // Invalidate daily cap cache so pricing page reflects latest state.
    revalidateTag(DAILY_CAP_STATUS_TAG, { expire: 0 });

    // Send trial started confirmation email (best-effort, non-fatal).
    if (user.email) {
      const { sendWaitlistSkipTrialStartedEmail } = await import("@/lib/waitlist/notifications");
      void sendWaitlistSkipTrialStartedEmail({ email: user.email }).catch((e) =>
        console.warn("[waitlist/skip/verify] trial started email failed", e instanceof Error ? e.message : e),
      );
    }

    return NextResponse.json({
      ok: true,
      trialStartedAt: result.trial_started_at,
      redirectTo: "/",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[waitlist/skip/verify] unexpected error", msg);
    return NextResponse.json({ ok: false, error: "Payment processing failed." }, { status: 500 });
  }
}
