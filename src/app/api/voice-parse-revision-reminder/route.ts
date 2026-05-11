import { NextResponse } from "next/server";

import {
  ensureVoiceMinuteHeadroom,
  incrementVoiceMinuteUsage,
} from "@/actions/subscription";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { runVoiceParseRevisionReminder } from "@/lib/runVoiceParseRevisionReminder";
import { clampVoiceBillingDurationSeconds } from "@/lib/voiceDurationBilling";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON." },
      { status: 400 },
    );
  }
  const o = body as Record<string, unknown>;
  const transcript = typeof o.transcript === "string" ? o.transcript : "";
  const today =
    typeof o.today === "string" ? o.today.trim() : typeof o.reference_date === "string" ? o.reference_date.trim() : "";
  const occurredAt =
    typeof o.occurred_at === "string" && o.occurred_at.trim()
      ? o.occurred_at.trim()
      : new Date().toISOString();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return NextResponse.json(
      { ok: false, error: "Invalid today date." },
      { status: 400 },
    );
  }
  const raw = transcript.trim().slice(0, 12_000);
  if (!raw) {
    return NextResponse.json(
      { ok: false, error: "Nothing was captured to parse." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Please sign in." },
      { status: 401 },
    );
  }

  const voiceSecondsCharged = clampVoiceBillingDurationSeconds(o.durationSeconds);

  const billedMinutes = voiceSecondsCharged / 60;
  const headroom = await ensureVoiceMinuteHeadroom(billedMinutes);
  if (!headroom.ok) {
    const msg = headroom.error;
    const quotaLike =
      /limit|trial ended|Upgrade|free trial|not configured|voice included/i.test(msg);
    return NextResponse.json(
      { ok: false, error: quotaLike ? "quota_exceeded" : msg },
      { status: quotaLike ? 429 : 403 },
    );
  }

  const result = await runVoiceParseRevisionReminder(raw, today, occurredAt);
  if (!result.ok) {
    return NextResponse.json({
      ...result,
      voice_seconds_charged: voiceSecondsCharged,
    });
  }

  const usage = await incrementVoiceMinuteUsage(voiceSecondsCharged / 60);
  if (!usage.ok) {
    const unauthorized = usage.error === "Please sign in.";
    return NextResponse.json(
      { ok: false, error: usage.error },
      { status: unauthorized ? 401 : 429 },
    );
  }

  return NextResponse.json({ ...result, voice_seconds_charged: voiceSecondsCharged });
}
