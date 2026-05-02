/**
 * Vercel Cron — runs on the 1st of every month at 00:00 UTC.
 * Resets ai_tokens_used = 0 for all users so the shared 2M monthly budget
 * refreshes for PrepBrain.
 *
 * Product note: this is a **global calendar reset** (same instant for every user),
 * not aligned to each customer’s Razorpay billing renewal date. If copy ever promises
 * “2M tokens per subscription month,” switch to per-user resets keyed off
 * subscription_start_date / webhook renewal instead of this single cron.
 *
 * Secured with CRON_SECRET (set in Vercel environment variables).
 * Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
 */
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/reset-ai-tokens
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  // Reset only rows that have actually accumulated usage to minimise write amplification.
  const { error, count } = await admin
    .from("user_profiles")
    .update({ ai_tokens_used: 0, ai_tokens_month: null })
    .gt("ai_tokens_used", 0);

  if (error) {
    console.error("[cron/reset-ai-tokens] reset failed", error);
    return NextResponse.json({ ok: false, error: "Reset failed." }, { status: 500 });
  }

  console.log("[cron/reset-ai-tokens] reset ai_tokens_used for %d rows", count ?? "?");
  return NextResponse.json({ ok: true, rows_reset: count ?? null });
}
