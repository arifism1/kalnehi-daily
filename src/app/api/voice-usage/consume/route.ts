import { NextResponse } from "next/server";

import {
  ensureVoiceMinuteHeadroom,
  incrementVoiceMinuteUsage,
} from "@/actions/subscription";
import { clampVoiceBillingDurationSeconds } from "@/lib/voiceDurationBilling";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

/**
 * POST /api/voice-usage/consume
 * Body: { durationSeconds?: number }
 * Deduction for browser Web Speech sessions that do not call parse/command routes.
 */
export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: USER_ERROR.session },
      { status: 401 },
    );
  }

  const voiceSecondsCharged = clampVoiceBillingDurationSeconds(body.durationSeconds);
  const billedMinutes = voiceSecondsCharged / 60;

  const headroom = await ensureVoiceMinuteHeadroom(billedMinutes);
  if (!headroom.ok) {
    const msg = headroom.error;
    const quotaLike =
      /limit|trial ended|Upgrade|free trial|not configured|voice included|Start your 7-day/i.test(
        msg,
      );
    return NextResponse.json(
      { ok: false, error: quotaLike ? "quota_exceeded" : msg },
      { status: quotaLike ? 429 : 403 },
    );
  }

  const usage = await incrementVoiceMinuteUsage(billedMinutes);
  if (!usage.ok) {
    const unauthorized = usage.error === "Please sign in.";
    return NextResponse.json(
      { ok: false, error: usage.error },
      { status: unauthorized ? 401 : 429 },
    );
  }

  return NextResponse.json({
    ok: true,
    voice_seconds_charged: voiceSecondsCharged,
    used: usage.used,
    limit: usage.limit,
  });
}
