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
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { distributedRateLimit } from "@/lib/distributedRateLimit";

export const runtime = "nodejs";

const SKIP_PRICE_PAISE = 1900; // ₹19 in paise

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
    return NextResponse.json({ ok: false, error: "Please sign in to skip the waitlist." }, { status: 401 });
  }

  const rl = await distributedRateLimit(`rl:waitlist_skip:${user.id}`, 60 * 60 * 1000, 5);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  // Block users who have already used a trial (either legacy has_had_trial flag or
  // the newer has_used_free_trial flag set by all post-launch trial-start code paths).
  const { data: prof } = await admin
    .from("user_profiles")
    .select("has_had_trial, has_used_free_trial, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const p = prof as { has_had_trial?: boolean; has_used_free_trial?: boolean; full_name?: string | null } | null;
  if (p?.has_had_trial || p?.has_used_free_trial) {
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

    const prefill: Record<string, string> = {
      name: p?.full_name ?? "",
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
