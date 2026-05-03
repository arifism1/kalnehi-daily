import { NextResponse } from "next/server";

import {
  ensureVoiceMinuteHeadroom,
  incrementVoiceMinuteUsage,
} from "@/actions/subscription";
import { clampVoiceBillingDurationSeconds } from "@/lib/voiceDurationBilling";
import {
  runVoiceNotificationParse,
  type VoiceNotificationParseFailureReason,
} from "@/lib/runVoiceNotificationParse";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
/** Voice quota + Groq can exceed default limits on cold starts. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function httpStatusForParseFailure(reason: VoiceNotificationParseFailureReason): number {
  if (reason === "config" || reason === "upstream") return 503;
  return 422;
}

export async function POST(req: Request) {
  try {
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

    const transcript =
      typeof body.transcript === "string" ? body.transcript.trim() : "";
    const raw = transcript.slice(0, 12_000);
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

    const ianaTimeZone =
      typeof body.ianaTimeZone === "string" && body.ianaTimeZone.trim()
        ? body.ianaTimeZone.trim().slice(0, 120)
        : "UTC";
    const nowIso =
      typeof body.nowIso === "string" && body.nowIso.trim()
        ? body.nowIso.trim()
        : new Date().toISOString();

    const voiceSecondsCharged = clampVoiceBillingDurationSeconds(body.durationSeconds);

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

    /**
     * Charge voice quota only after Groq successfully returns structured data,
     * so failed parses do not consume minutes.
     */
    const result = await runVoiceNotificationParse({
      transcript: raw,
      ianaTimeZone,
      nowIso,
    });

    if (!result.ok) {
      const status = httpStatusForParseFailure(result.reason);
      if (status >= 500) {
        console.error("[voice-time/parse] parse failed:", result.error);
      }
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }

    const usage = await incrementVoiceMinuteUsage(voiceSecondsCharged / 60);
    if (!usage.ok) {
      const unauthorized = usage.error === "Please sign in.";
      return NextResponse.json(
        { ok: false, error: usage.error },
        { status: unauthorized ? 401 : 429 },
      );
    }

    const d = result.data;
    return NextResponse.json({
      ok: true,
      title: d.title,
      notify_at: d.notify_at,
      subject: d.subject,
      chapter: d.chapter,
      tag: d.tag,
      repeat_type: d.repeat_type,
      groq_model: d.groq_model,
      voice_seconds_charged: voiceSecondsCharged,
    });
  } catch (e) {
    console.error("[voice-time/parse]", e);
    return NextResponse.json(
      {
        ok: false,
        error:
          "We could not finish voice parsing. Try again in a moment, or add the notification by typing.",
      },
      { status: 500 },
    );
  }
}
