/**
 * Legacy endpoint: Mastermind base allowance now rolls on **subscription anniversaries**
 * (`u:…` month keys + `usage_reset_date`), not a global calendar job.
 *
 * Kept as a no-op so old cron URLs return cleanly without wiping token state.
 * Secured with CRON_SECRET (Vercel: Authorization: Bearer <CRON_SECRET>).
 */
import { type NextRequest, NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";

/**
 * GET /api/cron/reset-ai-tokens
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    skipped: true,
    reason: "subscription_anniversary_keys",
  });
}
