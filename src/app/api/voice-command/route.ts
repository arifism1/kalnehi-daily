import { NextResponse } from "next/server";

import { incrementVoiceMinuteUsage } from "@/actions/subscription";
import { clampVoiceBillingDurationSeconds } from "@/lib/voiceDurationBilling";
import { runVoiceCommand } from "@/lib/voiceCommandGroq";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const transcript = typeof o.transcript === "string" ? o.transcript.trim() : "";
  const pageContext = typeof o.page_context === "string" ? o.page_context.trim() : "";

  if (!transcript) {
    return NextResponse.json(
      { ok: false, error: "Nothing was captured to process." },
      { status: 400 },
    );
  }

  const voiceSecondsCharged = clampVoiceBillingDurationSeconds(o.durationSeconds);

  // Auth must be confirmed before calling the LLM to avoid burning provider
  // quota for unauthenticated requests.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });
  }

  const result = await runVoiceCommand(transcript, pageContext);

  // Log voice AI token usage (best-effort, non-blocking)
  if (result.ok && (result.inputTokens > 0 || result.outputTokens > 0)) {
    const svcClient = getSupabaseServiceRoleClient();
    if (svcClient) {
      void svcClient.from("voice_ai_usage_log").insert({
        user_id: user.id,
        feature: "voice_command",
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        provider: "groq",
        model: result.model,
      });
    }
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  // Charge shared voice quota — same pool as Dictate My Day, revision voice, etc.
  const usage = await incrementVoiceMinuteUsage(voiceSecondsCharged / 60);
  if (!usage.ok) {
    const isUnauth = usage.error === "Please sign in.";
    const isQuota = !isUnauth;
    return NextResponse.json(
      { ok: false, error: isQuota ? "quota_exceeded" : usage.error },
      { status: isUnauth ? 401 : 429 },
    );
  }

  return NextResponse.json({
    ok: true,
    intent: result.intent,
    response_text: result.response_text,
    voice_seconds_charged: voiceSecondsCharged,
  });
}
