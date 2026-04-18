import { NextResponse } from "next/server";

import {
  incrementVoiceUsageFromSession,
  peekVoiceQuotaForBilledSeconds,
} from "@/actions/subscription";
import { runVoiceNotificationParse } from "@/lib/runVoiceNotificationParse";
import {
  normalizeDurationSecondsFromRequest,
} from "@/lib/voiceSessionBilling";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export async function POST(req: Request) {
  try {
    return await postVoiceNotificationParse(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    if (process.env.NODE_ENV === "development") {
      console.error("[voice-notification/parse] unhandled", e);
    } else {
      console.error("[voice-notification/parse] unhandled", msg);
    }
    return NextResponse.json(
      {
        ok: false,
        error:
          "We hit an unexpected error while parsing. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}

async function postVoiceNotificationParse(req: Request) {
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

  const billedSeconds = normalizeDurationSecondsFromRequest(
    body.durationSeconds,
  );
  const peek = await peekVoiceQuotaForBilledSeconds(billedSeconds);
  if (!peek.ok) {
    const unauthorized = peek.error === "Please sign in.";
    return NextResponse.json(
      { ok: false, error: peek.error },
      { status: unauthorized ? 401 : 429 },
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

  const result = await runVoiceNotificationParse({
    transcript: raw,
    ianaTimeZone,
    nowIso,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 422 },
    );
  }

  const usage = await incrementVoiceUsageFromSession(billedSeconds);
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
  });
}
