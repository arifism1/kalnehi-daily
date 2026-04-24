import { NextResponse } from "next/server";
import Groq from "groq-sdk";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const WHISPER_MODEL = "distil-whisper-large-v3-en";
const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // 4 MB

export async function POST(req: Request) {
  // Auth check — must be signed in before we'll accept audio.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const audioField = formData.get("audio");
  if (!(audioField instanceof File) || audioField.size === 0) {
    return NextResponse.json({ ok: false, error: "No audio file provided." }, { status: 400 });
  }
  if (audioField.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Audio too large. Please keep recordings under 4 MB." },
      { status: 413 },
    );
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Voice transcription is not configured on this server." },
      { status: 500 },
    );
  }

  try {
    const groq = new Groq({ apiKey });
    // verbose_json returns `duration` — the actual audio length in seconds.
    // We use this for billing instead of client-reported duration to prevent under-reporting.
    const transcription = await groq.audio.transcriptions.create({
      file: audioField,
      model: WHISPER_MODEL,
      language: "en",
      response_format: "verbose_json",
    });

    const transcript = (transcription.text ?? "").trim();
    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "No speech detected in the recording." },
        { status: 422 },
      );
    }

    // `duration` is in seconds as a float; round up to avoid zero-billing edge cases.
    const rawDur = (transcription as { duration?: number }).duration;
    const durationSeconds = Math.ceil(
      typeof rawDur === "number" && rawDur > 0 ? rawDur : 5,
    );

    return NextResponse.json({ ok: true, transcript, durationSeconds });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[voice-transcribe] Groq error:", msg);
    return NextResponse.json(
      { ok: false, error: "Transcription failed. Please try again." },
      { status: 500 },
    );
  }
}
