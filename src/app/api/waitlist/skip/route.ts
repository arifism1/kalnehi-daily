/**
 * POST /api/waitlist/skip
 * Creates a Razorpay order for the ₹19 waitlist skip.
 * Returns {ok, keyId, orderId, amountPaise, prefill} for the client checkout.
 */
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";

const SKIP_PRICE_PAISE = 1900; // ₹19 in paise

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
    return NextResponse.json({ ok: false, error: "Please sign in to skip the waitlist." }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  // Check user hasn't already had a trial.
  const { data: prof } = await admin
    .from("user_profiles")
    .select("has_had_trial, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (prof && (prof as { has_had_trial?: boolean }).has_had_trial) {
    return NextResponse.json({
      ok: false,
      error: "You have already used a free trial. The ₹19 skip is only available to new users.",
    }, { status: 400 });
  }

  const config = getRazorpayConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: "Payment is not configured." }, { status: 503 });
  }

  try {
    const razorpay = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });

    const receiptId = `wl_skip_${user.id.replace(/-/g, "").slice(0, 16)}_${Date.now()}`;

    const order = (await razorpay.orders.create({
      amount: SKIP_PRICE_PAISE,
      currency: "INR",
      receipt: receiptId,
      notes: {
        kalnehi_user_id: user.id,
        kalnehi_order_kind: "waitlist_skip",
        kalnehi_price_paise: String(SKIP_PRICE_PAISE),
      },
    })) as { id: string; amount: number };

    const profileRow = prof as { full_name?: string | null } | null;
    const prefill: Record<string, string> = {
      name: profileRow?.full_name ?? "",
      email: user.email ?? "",
    };

    return NextResponse.json({
      ok: true,
      keyId: config.keyId,
      orderId: order.id,
      amountPaise: SKIP_PRICE_PAISE,
      prefill,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[waitlist/skip] order creation failed", msg);
    return NextResponse.json({ ok: false, error: "Failed to create payment order." }, { status: 500 });
  }
}
