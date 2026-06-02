import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import Groq from "groq-sdk";

import { ensureVoiceMinuteHeadroom, incrementVoiceMinuteUsage } from "@/actions/subscription";
import {
  clampVoiceBillingDurationSeconds,
  estimateMaxVoiceAudioDurationSeconds,
  VOICE_BILLING_DURATION_SEC_MIN,
} from "@/lib/voiceDurationBilling";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { recordVoiceUsageEvent } from "@/lib/journey/recordVoiceUsage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isAudioBlobTooSmall,
  isGroqSupportedAudioMime,
  normalizeAudioMime,
  pickWhisperModel,
  whisperLanguageFromBcp47,
  type VoiceTranscribeErrorCode,
} from "@/lib/voiceTranscribeMime";

/** `verbose_json` adds `duration` (seconds); groq-sdk's Transcription type only declares `text`. */
type GroqVerboseTranscription = Awaited<
  ReturnType<InstanceType<typeof Groq>["audio"]["transcriptions"]["create"]>
> & { duration?: number };

const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // 4 MB

function transcribeError(
  error: string,
  status: number,
  errorCode: VoiceTranscribeErrorCode,
) {
  return NextResponse.json({ ok: false, error, errorCode }, { status });
}

export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) {
    return NextResponse.json(
      { ok: false, error: "Forbidden.", errorCode: "forbidden" as const },
      { status: 403 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return transcribeError("Please sign in.", 401, "auth");
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return transcribeError("Invalid form data.", 400, "provider_error");
  }

  const audioField = formData.get("audio");
  if (!(audioField instanceof File) || audioField.size === 0) {
    return transcribeError("No audio file provided.", 400, "empty_audio");
  }
  if (isAudioBlobTooSmall(audioField.size)) {
    return transcribeError(
      "Recording was too short or empty. Speak for at least a second, then try again.",
      422,
      "empty_audio",
    );
  }
  if (audioField.size > MAX_AUDIO_BYTES) {
    return transcribeError(
      "Audio too large. Please keep recordings under 4 MB.",
      413,
      "provider_error",
    );
  }

  const mime = normalizeAudioMime(audioField.type);
  if (!isGroqSupportedAudioMime(mime)) {
    console.warn("[voice-transcribe] unsupported mime:", mime, "size:", audioField.size);
    return transcribeError(
      "This device recorded audio in an unsupported format. Update the app or try Chrome.",
      422,
      "unsupported_format",
    );
  }

  const langField = formData.get("lang");
  const lang =
    typeof langField === "string" && langField.trim() ? langField.trim() : "en-IN";
  const whisperLang = whisperLanguageFromBcp47(lang);
  const whisperModel = pickWhisperModel(lang);

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return transcribeError(
      "Voice transcription is not configured on this server.",
      500,
      "provider_error",
    );
  }

  const headroomMin =
    clampVoiceBillingDurationSeconds(
      estimateMaxVoiceAudioDurationSeconds(audioField.size),
    ) / 60;
  const headroom = await ensureVoiceMinuteHeadroom(headroomMin);
  if (!headroom.ok) {
    return transcribeError(headroom.error, 402, "quota");
  }

  try {
    const groq = new Groq({ apiKey });
    const transcription = await groq.audio.transcriptions.create({
      file: audioField,
      model: whisperModel,
      language: whisperLang,
      response_format: "verbose_json",
    });

    const transcript = (transcription.text ?? "").trim();
    if (!transcript) {
      return transcribeError(
        "No speech detected in the recording.",
        422,
        "no_speech",
      );
    }

    const verbose = transcription as GroqVerboseTranscription;
    const billedSeconds = clampVoiceBillingDurationSeconds(
      typeof verbose.duration === "number" && verbose.duration > 0
        ? verbose.duration
        : VOICE_BILLING_DURATION_SEC_MIN,
    );
    const durationSeconds = billedSeconds;

    const usage = await incrementVoiceMinuteUsage(billedSeconds / 60);
    if (!usage.ok) {
      const unauthorized = usage.error === "Please sign in.";
      return transcribeError(
        usage.error,
        unauthorized ? 401 : 402,
        unauthorized ? "auth" : "quota",
      );
    }

    void recordVoiceUsageEvent(user.id, {
      feature: "voice_transcribe",
      secondsCharged: billedSeconds,
    });

    return NextResponse.json({ ok: true, transcript, durationSeconds });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    let sampleHash = "";
    try {
      const buf = await audioField.arrayBuffer();
      sampleHash = createHash("sha256")
        .update(new Uint8Array(buf.slice(0, Math.min(256, buf.byteLength))))
        .digest("hex")
        .slice(0, 16);
    } catch {
      /* ignore */
    }
    console.error("[voice-transcribe] Groq error:", {
      msg,
      mime,
      size: audioField.size,
      sampleHash,
      model: whisperModel,
      lang: whisperLang,
    });
    return transcribeError(
      "Transcription failed. Please try again.",
      500,
      "provider_error",
    );
  }
}
