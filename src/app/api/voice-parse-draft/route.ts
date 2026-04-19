import { NextResponse } from "next/server";

import { incrementVoiceMinuteUsage } from "@/actions/subscription";
import { runVoiceParseDraft } from "@/lib/runVoiceParseDraft";
import { clampVoiceBillingDurationSeconds } from "@/lib/voiceDurationBilling";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
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
  const logDate = typeof o.log_date === "string" ? o.log_date.trim() : "";
  const occurredAt =
    typeof o.occurred_at === "string" && o.occurred_at.trim()
      ? o.occurred_at.trim()
      : new Date().toISOString();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return NextResponse.json(
      { ok: false, error: "Invalid date." },
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

  const result = await runVoiceParseDraft(raw, logDate, occurredAt);
  if (!result.ok) {
    return NextResponse.json({ ...result, voice_seconds_charged: voiceSecondsCharged });
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
