import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BASE64_CHARS = 140_000; // ~640×640 JPEG after base64 ≈ 100KB decoded
const RATE_LIMIT_MS = 90_000;

const DEEPINFRA_API_URL = "https://api.deepinfra.com/v1/openai/chat/completions";
const DEEPINFRA_MODEL = "Qwen/Qwen2.5-VL-32B-Instruct";

const lastRequestAt = new Map<string, number>();

const STUDY_MONITOR_PROMPT =
  "You are a study monitor. Look at this webcam image and decide if the student is actively studying.\n\n" +
  "Studying means: reading books, notes or a textbook; writing or solving problems; looking at study material on a screen.\n" +
  "NOT studying means: looking at a phone, watching entertainment, daydreaming with no material visible, sleeping, absent from frame, or holding a phone in selfie mode.\n\n" +
  'Reply ONLY with valid JSON, no markdown:\n{"person_visible": true, "is_studying": true, "confidence": "high", "reason": "Student reading textbook, pen visible"}\n\n' +
  "confidence must be one of: high, medium, low. Use high when you are sure; low when the image is unclear.";

function parseJsonVerdict(text: string): {
  person_visible: boolean;
  is_studying: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
} | null {
  const cleaned = text.trim();
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned) as {
      person_visible: boolean;
      is_studying: boolean;
      confidence: "high" | "medium" | "low";
      reason: string;
    };
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as {
        person_visible: boolean;
        is_studying: boolean;
        confidence: "high" | "medium" | "low";
        reason: string;
      };
    } catch {
      return null;
    }
  }
}

function normalizeVerdict(raw: {
  person_visible: boolean;
  is_studying: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
}) {
  const c = raw.confidence;
  const confidence =
    c === "high" || c === "medium" || c === "low" ? c : "medium";
  return {
    person_visible: Boolean(raw.person_visible),
    is_studying: Boolean(raw.is_studying),
    confidence,
    reason:
      typeof raw.reason === "string" && raw.reason.trim() ? raw.reason.trim() : "—",
  };
}

/**
 * POST /api/study-camera/verify
 * Body: { frame: string } base64 JPEG (no data: prefix), max ~100KB decoded (640px cap).
 * Uses Qwen2.5-VL-32B-Instruct via DeepInfra to classify whether the student is studying.
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
      { ok: false, error: "Study camera verification is not configured." },
      { status: 503 },
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
    return NextResponse.json(
      { ok: false, error: "Frame data too small." },
      { status: 400 },
    );
  }

  const now = Date.now();
  const last = lastRequestAt.get(user.id) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    const retryAfterSec = Math.max(1, Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000));
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait before the next check." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }
  lastRequestAt.set(user.id, now);
  if (lastRequestAt.size > 5_000) {
    const toDelete: string[] = [];
    for (const [k, t] of lastRequestAt) {
      if (now - t > 600_000) toDelete.push(k);
    }
    for (const k of toDelete) lastRequestAt.delete(k);
  }

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
              { type: "text", text: STUDY_MONITOR_PROMPT },
            ],
          },
        ],
        max_tokens: 120,
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      console.error("[study-camera/verify] DeepInfra error status", resp.status);
      return NextResponse.json(
        { ok: false, error: "Verification failed. Try again in a moment." },
        { status: 502 },
      );
    }

    const json = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = parseJsonVerdict(text);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: "Could not parse model response." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, verdict: normalizeVerdict(parsed) });
  } catch (e) {
    console.error("[study-camera/verify] DeepInfra error", e);
    return NextResponse.json(
      { ok: false, error: "Verification failed. Try again in a moment." },
      { status: 502 },
    );
  }
}
