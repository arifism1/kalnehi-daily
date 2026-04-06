import { NextResponse } from "next/server";

import { parseVoiceNoteWithGroq } from "@/actions/voiceDictate";
import { USER_ERROR } from "@/lib/userFacingErrors";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 128_000;

type PostBody = {
  transcript?: string;
  log_date?: string;
  /** ISO when the user spoke (optional; default now) */
  occurred_at?: string;
};

function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * POST /api/voice-log
 * Auth: Supabase session cookie. Body: { transcript, log_date, occurred_at? }
 * Parses transcript with Groq and inserts `voice_timeline_entries`, or returns fallback payload.
 */
export async function POST(request: Request) {
  let body: PostBody;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Transcript too long." },
        { status: 413 },
      );
    }
    body = JSON.parse(raw) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const transcript = typeof body.transcript === "string" ? body.transcript : "";
  const logDate = typeof body.log_date === "string" ? body.log_date.trim() : "";
  if (!transcript.trim()) {
    return NextResponse.json({ ok: false, error: "Empty transcript." }, { status: 400 });
  }
  if (!isValidYmd(logDate)) {
    return NextResponse.json({ ok: false, error: "Invalid log_date." }, { status: 400 });
  }

  let occurredAt = new Date().toISOString();
  if (typeof body.occurred_at === "string") {
    const d = new Date(body.occurred_at);
    if (!Number.isNaN(d.getTime())) occurredAt = d.toISOString();
  }

  const result = await parseVoiceNoteWithGroq({
    transcript,
    log_date: logDate,
    occurred_at: occurredAt,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.error === USER_ERROR.session ? 401 : 422 },
    );
  }

  if (result.mode === "fallback") {
    return NextResponse.json({
      ok: true,
      mode: "fallback",
      transcript: result.transcript,
    });
  }

  return NextResponse.json({
    ok: true,
    mode: "parsed",
    ids: result.entryIds,
    id: result.entryIds[0] ?? null,
    parsed: result.preview,
  });
}
