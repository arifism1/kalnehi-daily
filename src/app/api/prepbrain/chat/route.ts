import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { NextResponse } from "next/server";

import {
  truncatePrepBrainContextForApi,
  type PrepBrainContext,
} from "@/lib/prepBrainContext";
import { PREPBRAIN_SYSTEM_PROMPT } from "@/lib/prepBrainPrompts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GROQ_VOICE_MODEL_CANDIDATES } from "@/lib/voiceDictateGroq";
import { USER_ERROR } from "@/lib/userFacingErrors";
import {
  buildPrepbrainUsagePayload,
  effectivePrepbrainTokensUsed,
  prepbrainCalendarMonthKey,
  prepbrainLimitReachedMessage,
  prepbrainMonthlyTokenLimit,
  type PrepBrainTokenRow,
} from "@/lib/prepbrainTokens";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 512_000;
const MAX_CHAT_MESSAGES = 32;
const MAX_MESSAGE_CHARS = 12_000;
/** High enough for week-style plans; default verbosity is controlled in PREPBRAIN_SYSTEM_PROMPT (brevity rules). */
const MAX_COMPLETION_TOKENS = 2_048;
/** Best-effort cooldown per user (same server instance; mitigates double-submit / burst). */
const MIN_MS_BETWEEN_REQUESTS = 1_200;
const lastPrepBrainRequestAt = new Map<string, number>();

type ChatRole = "user" | "assistant";

type IncomingMessage = {
  role: ChatRole;
  content: string;
};

function isCurrentlyPaid(
  status: string | null,
  endDate: string | null,
): boolean {
  if (
    status !== "trial" &&
    status !== "active" &&
    status !== "cancelled"
  ) {
    return false;
  }
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > Date.now();
}

function isProTier(raw: string | null | undefined): boolean {
  return raw === "pro" || raw === "pro_max";
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function parseMessages(raw: unknown): IncomingMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const out: IncomingMessage[] = [];
  for (const m of raw) {
    if (!isRecord(m)) return null;
    const role = m.role;
    const content = m.content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    const trimmed = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!trimmed) continue;
    out.push({ role, content: trimmed });
  }
  if (out.length === 0) return null;
  return out.slice(-MAX_CHAT_MESSAGES);
}

/**
 * POST /api/prepbrain/chat
 * Body: { messages: { role, content }[], context: PrepBrainContext } (human-oriented field names)
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

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }
  if (rawText.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText) as unknown;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  const messages = parseMessages(body.messages);
  if (!messages) {
    return NextResponse.json(
      { ok: false, error: "messages[] required with non-empty user/assistant entries." },
      { status: 400 },
    );
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return NextResponse.json(
      { ok: false, error: "Last message must be from the user." },
      { status: 400 },
    );
  }

  if (!isRecord(body.context)) {
    return NextResponse.json(
      { ok: false, error: "context object required." },
      { status: 400 },
    );
  }

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select(
      "subscription_status, subscription_end_date, subscription_tier, prepbrain_tokens_used, prepbrain_tokens_month",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return NextResponse.json(
      { ok: false, error: "Could not verify subscription." },
      { status: 403 },
    );
  }

  const paid = isCurrentlyPaid(
    profile.subscription_status ?? null,
    profile.subscription_end_date ?? null,
  );
  const tier = profile.subscription_tier ?? null;
  if (!paid || !isProTier(tier)) {
    return NextResponse.json(
      { ok: false, error: "PrepBrain AI requires an active Pro or Pro Max plan." },
      { status: 403 },
    );
  }

  const monthKey = prepbrainCalendarMonthKey();
  const tokenRow: PrepBrainTokenRow = {
    prepbrain_tokens_used: profile.prepbrain_tokens_used,
    prepbrain_tokens_month: profile.prepbrain_tokens_month,
  };
  const effectiveUsed = effectivePrepbrainTokensUsed(tokenRow, monthKey);
  const tokenLimit = prepbrainMonthlyTokenLimit(tier);
  if (effectiveUsed >= tokenLimit) {
    const usagePayload = buildPrepbrainUsagePayload(tier, tokenRow, monthKey);
    return NextResponse.json(
      {
        ok: false,
        error: prepbrainLimitReachedMessage(usagePayload.tier),
        usage: usagePayload,
      },
      { status: 403 },
    );
  }

  const nowMs = Date.now();
  const lastMs = lastPrepBrainRequestAt.get(user.id);
  if (
    lastMs !== undefined &&
    nowMs - lastMs < MIN_MS_BETWEEN_REQUESTS
  ) {
    const retrySec = Math.max(
      1,
      Math.ceil((MIN_MS_BETWEEN_REQUESTS - (nowMs - lastMs)) / 1000),
    );
    return NextResponse.json(
      { ok: false, error: "Please wait a moment before sending again." },
      {
        status: 429,
        headers: { "Retry-After": String(retrySec) },
      },
    );
  }
  lastPrepBrainRequestAt.set(user.id, nowMs);

  let context: PrepBrainContext;
  try {
    context = truncatePrepBrainContextForApi(
      body.context as PrepBrainContext,
    );
  } catch (e) {
    console.error("[prepbrain/chat] context truncate failed", e);
    return NextResponse.json({ ok: false, error: "Invalid context." }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  const contextJson = JSON.stringify(context);
  const systemContent = `${PREPBRAIN_SYSTEM_PROMPT}\n\n--- CURRENT USER CONTEXT (JSON; ground truth for this turn) ---\n${contextJson}\n--- END CONTEXT ---`;

  const groqMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...messages.map((m) =>
      m.role === "user"
        ? ({ role: "user", content: m.content } as const)
        : ({ role: "assistant", content: m.content } as const),
    ),
  ];

  const models: readonly string[] = GROQ_VOICE_MODEL_CANDIDATES;

  let assistantText = "";
  let lastErr: unknown;
  let groqTotalTokens = 0;
  const groq = new Groq({ apiKey });
  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.65,
        max_tokens: MAX_COMPLETION_TOKENS,
        messages: groqMessages,
      });
      const raw = completion.choices[0]?.message?.content;
      assistantText = typeof raw === "string" ? raw.trim() : "";
      const u = completion.usage;
      groqTotalTokens =
        u?.total_tokens ??
        (u?.prompt_tokens ?? 0) + (u?.completion_tokens ?? 0);
      if (assistantText) break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!assistantText) {
    console.error("[prepbrain/chat] Groq error", lastErr);
    return NextResponse.json(
      { ok: false, error: "Could not get a response. Try again." },
      { status: 502 },
    );
  }

  const delta = Math.max(0, Math.floor(groqTotalTokens));
  const nextUsed = effectiveUsed + delta;
  const { error: tokenPersistErr } = await supabase
    .from("user_profiles")
    .update({
      prepbrain_tokens_used: nextUsed,
      prepbrain_tokens_month: monthKey,
    })
    .eq("user_id", user.id);

  if (tokenPersistErr) {
    console.error("[prepbrain/chat] token persist failed", tokenPersistErr);
  }

  const usageAfter = buildPrepbrainUsagePayload(
    tier,
    {
      prepbrain_tokens_used: nextUsed,
      prepbrain_tokens_month: monthKey,
    },
    monthKey,
  );

  return NextResponse.json({ ok: true, message: assistantText, usage: usageAfter });
}
