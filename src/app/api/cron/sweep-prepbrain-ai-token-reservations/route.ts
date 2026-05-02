/**
 * Vercel Cron — refunds estimate for PrepBrain AI token reservations that passed
 * expires_at without finalize (abandoned requests, crashed handlers, or finalize RPC failures).
 *
 * Secured with CRON_SECRET (same pattern as reset-ai-tokens).
 */
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/sweep-prepbrain-ai-token-reservations
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const { data, error } = await admin.rpc("prepbrain_ai_token_sweep_expired");
  if (error) {
    console.error("[cron/sweep-prepbrain-ai-token-reservations]", error.message);
    return NextResponse.json({ ok: false, error: "Sweep failed." }, { status: 500 });
  }

  console.log("[cron/sweep-prepbrain-ai-token-reservations]", data);
  return NextResponse.json({ ok: true, result: data });
}
