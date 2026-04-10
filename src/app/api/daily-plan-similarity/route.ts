import Groq from "groq-sdk";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GROQ_VOICE_MODEL } from "@/lib/voiceDictateGroq";
import { USER_ERROR } from "@/lib/userFacingErrors";

export const runtime = "nodejs";

type Body = {
  new_title?: string;
  new_time_slot?: string | null;
  existing_title?: string;
  existing_time_slot?: string | null;
};

/**
 * Light Groq check: are two tasks likely the same intent (merge) vs distinct?
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: USER_ERROR.session },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const a = String(body.new_title ?? "").trim().slice(0, 300);
  const b = String(body.existing_title ?? "").trim().slice(0, 300);
  if (!a || !b) {
    return NextResponse.json(
      { ok: false, error: "Both titles required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      verdict: "uncertain" as const,
      reason: "no_api_key",
    });
  }

  const tsNew = body.new_time_slot ?? "—";
  const tsEx = body.existing_time_slot ?? "—";

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: GROQ_VOICE_MODEL,
      temperature: 0.1,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            'You compare two daily plan tasks. Reply with ONLY compact JSON: {"verdict":"same"|"different"|"uncertain","confidence":0-1} — same means user likely meant one activity twice; different means two separate activities.',
        },
        {
          role: "user",
          content: `Task A: time "${tsNew}", title: ${JSON.stringify(a)}\nTask B: time "${tsEx}", title: ${JSON.stringify(b)}`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = m ? (JSON.parse(m[0]) as { verdict?: string; confidence?: number }) : {};
    const v = parsed.verdict;
    const verdict =
      v === "same" || v === "different" || v === "uncertain" ? v : "uncertain";
    const confidence =
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5;
    return NextResponse.json({ ok: true, verdict, confidence });
  } catch {
    return NextResponse.json({
      ok: true,
      verdict: "uncertain" as const,
      confidence: 0,
    });
  }
}
