import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";

const MAX_BASE64_CHARS = 340_000; // ~250 KB JPEG after base64
const RATE_LIMIT_MS = 120_000; // 1 request per 120s per user

const STUDY_PARTNER_PROMPT =
  "You are a warm, encouraging AI study coach watching via the student's webcam. " +
  "Look at the image and write 1–2 sentences of calm, supportive feedback about what you observe. " +
  "Be specific when helpful. Examples: " +
  '"Looking focused, keep it up!" ' +
  '"I see your phone there — let\'s set it aside and get back to it." ' +
  '"Your posture is drifting, try sitting up straight." ' +
  '"Great concentration on those notes!" ' +
  "Never mention the camera or that you are an AI. Respond ONLY with the feedback text, no JSON, no quotes.";

const DEEPINFRA_API_URL = "https://api.deepinfra.com/v1/openai/chat/completions";
const DEEPINFRA_MODEL = "Qwen/Qwen2.5-VL-32B-Instruct";

/**
 * POST /api/study-partner/feedback
 * Body: { frame: string } base64 JPEG (with or without data: prefix).
 * Returns: { ok: true, feedback: string } | { ok: false, error: string }
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.DEEPINFRA_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "AI Study Partner is not configured." },
      { status: 503 },
    );
  }

  // Balance check
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("ai_study_partner_seconds_remaining")
    .eq("user_id", user.id)
    .maybeSingle();
  const balance = profileData?.ai_study_partner_seconds_remaining ?? 0;
  if (balance <= 0) {
    return NextResponse.json(
      { ok: false, error: "No AI Study Partner credits remaining." },
      { status: 402 },
    );
  }

  let body: unknown;
  try {
    body = (await request.json()) as unknown;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("frame" in body)) {
    return NextResponse.json(
      { ok: false, error: "Missing `frame` (base64 JPEG)." },
      { status: 400 },
    );
  }
  const frame = (body as { frame?: unknown }).frame;
  if (typeof frame !== "string" || !frame.trim()) {
    return NextResponse.json({ ok: false, error: "Invalid `frame`." }, { status: 400 });
  }
  const b64 = frame.replace(/^data:image\/\w+;base64,/, "").trim();
  if (b64.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ ok: false, error: "Frame too large." }, { status: 413 });
  }
  if (b64.length < 80) {
    return NextResponse.json({ ok: false, error: "Frame data too small." }, { status: 400 });
  }

  // DB-backed rate limiting shared across all serverless instances.
  // Fail hard if the service-role client is unavailable — we must never skip
  // the cooldown check and allow an unbounded call to DeepInfra.
  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Service temporarily unavailable." },
      { status: 503 },
    );
  }

  const now = new Date().toISOString();
  const { data: cooldown } = await admin
    .from("study_partner_cooldown" as never)
    .select("last_request_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const last = (cooldown as { last_request_at?: string } | null)?.last_request_at;
  if (last) {
    const elapsed = Date.now() - new Date(last).getTime();
    if (elapsed < RATE_LIMIT_MS) {
      const retryAfterSec = Math.max(1, Math.ceil((RATE_LIMIT_MS - elapsed) / 1000));
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please wait before the next feedback." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }
  }

  await admin
    .from("study_partner_cooldown" as never)
    .upsert({ user_id: user.id, last_request_at: now } as never, {
      onConflict: "user_id",
    });

  try {
    const resp = await fetch(DEEPINFRA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPINFRA_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${b64}` },
              },
              { type: "text", text: STUDY_PARTNER_PROMPT },
            ],
          },
        ],
        max_tokens: 120,
        temperature: 0.5,
      }),
    });

    if (!resp.ok) {
      console.error("[study-partner/feedback] DeepInfra error status", resp.status);
      return NextResponse.json(
        { ok: false, error: "AI feedback temporarily unavailable." },
        { status: 502 },
      );
    }

    const json = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const feedback = json.choices?.[0]?.message?.content?.trim();
    if (!feedback) {
      return NextResponse.json(
        { ok: false, error: "Empty response from AI." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, feedback });
  } catch (e) {
    console.error("[study-partner/feedback] unexpected error", e);
    return NextResponse.json(
      { ok: false, error: "AI feedback failed. Try again in a moment." },
      { status: 502 },
    );
  }
}
