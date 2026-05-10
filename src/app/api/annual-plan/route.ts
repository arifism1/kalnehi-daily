/**
 * POST /api/annual-plan
 * Creates a Razorpay order for Smart Plan Annual (upfront total in {@link SMART_PLAN_ANNUAL_PRICE_PAISE}).
 */
import Razorpay from "razorpay";
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { SMART_PLAN_ANNUAL_PRICE_PAISE } from "@/lib/smartPlanPricing";

export const runtime = "nodejs";

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export async function POST(req: NextRequest) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  void req;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to subscribe." }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  // Block if the user already has any active upfront plan (annual or six_month).
  const { data: prof } = await admin
    .from("user_profiles")
    .select("subscription_status, subscription_end_date, subscription_plan, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const p = prof as { subscription_status?: string | null; subscription_end_date?: string | null; subscription_plan?: string | null; full_name?: string | null } | null;
  const isAlreadyOnUpfrontPlan =
    (p?.subscription_plan === "annual" || p?.subscription_plan === "six_month") &&
    p?.subscription_end_date &&
    new Date(p.subscription_end_date) > new Date();

  if (isAlreadyOnUpfrontPlan) {
    return NextResponse.json({
      ok: false,
      error: "You already have an active plan.",
    }, { status: 400 });
  }

  const config = getRazorpayConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: "Payment is not configured." }, { status: 503 });
  }

  try {
    const razorpay = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
    const receiptId = `annual_${user.id.replace(/-/g, "").slice(0, 16)}_${Date.now()}`;

    const order = (await razorpay.orders.create({
      amount: SMART_PLAN_ANNUAL_PRICE_PAISE,
      currency: "INR",
      receipt: receiptId,
      notes: {
        kalnehi_user_id: user.id,
        kalnehi_order_kind: "annual_plan",
        kalnehi_price_paise: String(SMART_PLAN_ANNUAL_PRICE_PAISE),
      },
    })) as { id: string; amount: number };

    return NextResponse.json({
      ok: true,
      keyId: config.keyId,
      orderId: order.id,
      amountPaise: SMART_PLAN_ANNUAL_PRICE_PAISE,
      prefill: { name: p?.full_name ?? "", email: user.email ?? "" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[annual-plan] order creation failed", msg);
    return NextResponse.json({ ok: false, error: "Failed to create payment order." }, { status: 500 });
  }
}
