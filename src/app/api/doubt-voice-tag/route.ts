import { NextResponse } from "next/server";

import {
  incrementVoiceUsageFromSession,
  peekVoiceQuotaForBilledSeconds,
} from "@/actions/subscription";
import {
  allValidTopicLinesFromRows,
  buildDoubtVoiceTagSubjectList,
  buildTopicLinesForPrompt,
  fetchDoubtVoiceTagSyllabusRows,
} from "@/lib/doubtVoiceTagSyllabus";
import { runDoubtVoiceTagGroq } from "@/lib/runDoubtVoiceTag";
import { normalizeDurationSecondsFromRequest } from "@/lib/voiceSessionBilling";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

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

  const transcript =
    typeof body.transcript === "string" ? body.transcript.trim() : "";
  const raw = transcript.slice(0, 12_000);
  if (!raw) {
    return NextResponse.json(
      { ok: false, error: "Nothing was captured to tag." },
      { status: 400 },
    );
  }

  const prepbrainContextTrim = body.prepbrain_context_trim;

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

  let rows: Awaited<
    ReturnType<typeof fetchDoubtVoiceTagSyllabusRows>
  >["rows"] = [];
  try {
    const fetched = await fetchDoubtVoiceTagSyllabusRows(supabase, user.id);
    rows = fetched.rows;
  } catch {
    return NextResponse.json({
      ok: true,
      doubt_text: raw,
      subject: null as string | null,
      topic: null as string | null,
      groq_model: "",
    });
  }

  const billedSeconds = normalizeDurationSecondsFromRequest(body.durationSeconds);
  const peek = await peekVoiceQuotaForBilledSeconds(billedSeconds);
  if (!peek.ok) {
    const unauthorized = peek.error === "Please sign in.";
    return NextResponse.json(
      { ok: false, error: peek.error },
      { status: unauthorized ? 401 : 429 },
    );
  }

  const allowedSubjects = buildDoubtVoiceTagSubjectList(rows);
  const validSubjects = new Set(allowedSubjects);
  const validTopicLines = allValidTopicLinesFromRows(rows);
  const topicLinesForPrompt = buildTopicLinesForPrompt(rows, {
    perSubjectCap: 35,
    maxTotalLines: 280,
  });

  const prepTrim =
    prepbrainContextTrim != null &&
    typeof prepbrainContextTrim === "object" &&
    !Array.isArray(prepbrainContextTrim)
      ? prepbrainContextTrim
      : undefined;

  const groq = await runDoubtVoiceTagGroq(
    {
      transcript: raw,
      allowedSubjects,
      topicLinesForPrompt,
      prepbrainContextTrim: prepTrim,
    },
    validSubjects,
    validTopicLines,
  );

  if (!groq.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          typeof groq.error === "string" && groq.error.trim()
            ? groq.error
            : "Could not tag this doubt. Try again.",
      },
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

  return NextResponse.json({
    ok: true,
    doubt_text: groq.data.doubt_text,
    subject: groq.data.subject,
    topic: groq.data.topic,
    groq_model: groq.data.groq_model,
  });
}
