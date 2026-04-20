import { NextResponse } from "next/server";

import { incrementVoiceMinuteUsage } from "@/actions/subscription";
import { clampVoiceBillingDurationSeconds } from "@/lib/voiceDurationBilling";
import { runRevisionRecallGroq } from "@/lib/runRevisionRecallGroq";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

/**
 * Scores typed or voice recall (voice uses Groq after on-device transcript + optional voice quota).
 */
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

  if (!isRecord(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid body." },
      { status: 400 },
    );
  }

  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) {
    return NextResponse.json(
      { ok: false, error: "Nothing to evaluate." },
      { status: 400 },
    );
  }

  const topicTitle =
    typeof body.topicTitle === "string" ? body.topicTitle.trim() : "";
  if (!topicTitle) {
    return NextResponse.json(
      { ok: false, error: "Topic title is required." },
      { status: 400 },
    );
  }

  const mode = body.mode === "voice" ? "voice" : "typed";
  const subject = typeof body.subject === "string" ? body.subject : null;
  const chapter = typeof body.chapter === "string" ? body.chapter : null;

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

  const groq = await runRevisionRecallGroq({
    topicTitle,
    subject,
    chapter,
    transcript: transcript.slice(0, 12_000),
  });

  if (!groq.ok) {
    return NextResponse.json(
      { ok: false, error: groq.error },
      { status: 502 },
    );
  }

  let voice_seconds_charged = 0;
  if (mode === "voice") {
    voice_seconds_charged = clampVoiceBillingDurationSeconds(body.durationSeconds);
    const usage = await incrementVoiceMinuteUsage(voice_seconds_charged / 60);
    if (!usage.ok) {
      const unauthorized = usage.error === "Please sign in.";
      return NextResponse.json(
        { ok: false, error: usage.error },
        { status: unauthorized ? 401 : 429 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    quality_score: groq.data.quality_score,
    feedback: groq.data.feedback,
    suggested_focus: groq.data.suggested_focus,
    groq_model: groq.data.groq_model,
    groq_feedback: groq.data.groq_feedback,
    voice_seconds_charged: mode === "voice" ? voice_seconds_charged : 0,
  });
}
