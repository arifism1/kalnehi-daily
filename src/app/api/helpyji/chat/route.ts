import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { NextResponse } from "next/server";

import { HELPYJI_SYSTEM_PROMPT, type HelpyJiSurface } from "@/lib/helpyjiPrompts";
import {
  HELPYJI_COOLDOWN_MS_LOGGED_IN,
  HELPYJI_DAILY_LIMIT_LOGGED_IN,
  helpyjiCooldownMessage,
  helpyjiDailyLimitReachedMessage,
  helpyjiUtcDayString,
} from "@/lib/helpyjiLimits";
import {
  truncatePrepBrainContextForApi,
  type PrepBrainContext,
} from "@/lib/prepBrainContext";
import { parseSubscriptionTier, type SubscriptionTier } from "@/lib/subscriptionTiers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveHelpyjiGroqModels } from "@/lib/groqHelpyjiModel";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 120_000;
const MAX_CHAT_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_COMPLETION_TOKENS = 150;
const MAX_DB_CONTENT_CHARS = 32_000;

type ChatRole = "user" | "assistant";

type IncomingMessage = {
  role: ChatRole;
  content: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

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

function looksLikePrepBrainContext(x: unknown): x is PrepBrainContext {
  if (!isRecord(x)) return false;
  return typeof x.context_generated_at === "string";
}

function parseSurface(raw: unknown): HelpyJiSurface | null {
  if (raw === "pricing" || raw === "upgrade") return raw;
  return null;
}

function parseSessionId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)) {
    return null;
  }
  return t;
}


function buildCommerceBlock(input: {
  surface: HelpyJiSurface;
  paid: boolean;
  tier: SubscriptionTier | null;
  status: string | null;
}): string {
  const { surface, paid, tier, status } = input;
  const upsell =
    paid && tier === "basic"
      ? ["pro", "pro_max"]
      : paid && tier === "pro"
        ? ["pro_max"]
        : paid && tier === "pro_max"
          ? []
          : ["basic", "pro", "pro_max"];
  return JSON.stringify({
    surface,
    has_active_paid_entitlement: paid,
    subscription_status: status,
    subscription_tier: tier,
    upgrade_targets_hint: upsell,
  });
}

function clipForDb(s: string): string {
  if (s.length <= MAX_DB_CONTENT_CHARS) return s;
  return `${s.slice(0, MAX_DB_CONTENT_CHARS)}\n…[truncated]`;
}

/**
 * POST /api/helpyji/chat
 * Body: { messages, surface, session_id, context?: PrepBrainContext }
 * Auth required. Pro / Pro Max users are not eligible.
 */
export async function POST(request: Request) {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      {
        ok: false,
        error: "HelpyJi is temporarily unavailable. Try again later.",
      },
      { status: 503 },
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in to use HelpyJi." },
      { status: 401 },
    );
  }

  const sessionId = parseSessionId(body.session_id);
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "session_id (UUID) is required." },
      { status: 400 },
    );
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

  const surface = parseSurface(body.surface);
  if (!surface) {
    return NextResponse.json(
      { ok: false, error: 'surface must be "pricing" or "upgrade".' },
      { status: 400 },
    );
  }

  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .select("subscription_status, subscription_end_date, subscription_tier")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("[helpyji/chat] profile read failed", profileErr);
    return NextResponse.json(
      { ok: false, error: "Could not load your account. Try again." },
      { status: 500 },
    );
  }

  const paid = profile
    ? isCurrentlyPaid(
        profile.subscription_status ?? null,
        profile.subscription_end_date ?? null,
      )
    : false;
  const tier = parseSubscriptionTier(profile?.subscription_tier ?? undefined);

  if (
    surface !== "pricing" &&
    (tier === "pro" || tier === "pro_max")
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "HelpyJi on this page is for Basic and trial upgrades. Pro and Pro Max subscribers can use PrepBrain inside the app.",
      },
      { status: 403 },
    );
  }

  const subjectKey = `user:${user.id}`;
  const dailyLimit = HELPYJI_DAILY_LIMIT_LOGGED_IN;
  const cooldownMs = HELPYJI_COOLDOWN_MS_LOGGED_IN;

  const dayStr = helpyjiUtcDayString();
  const nowMs = Date.now();

  const { data: usageRow, error: usageReadErr } = await admin
    .from("helpyji_daily_usage")
    .select("message_count, last_message_at")
    .eq("subject_key", subjectKey)
    .eq("day", dayStr)
    .maybeSingle();

  if (usageReadErr) {
    console.error("[helpyji/chat] usage read failed", usageReadErr);
    return NextResponse.json(
      { ok: false, error: "Could not verify quota. Try again." },
      { status: 500 },
    );
  }

  const used = usageRow?.message_count ?? 0;
  if (used >= dailyLimit) {
    return NextResponse.json(
      {
        ok: false,
        error: helpyjiDailyLimitReachedMessage(true),
        limit: dailyLimit,
        remaining: 0,
      },
      { status: 403 },
    );
  }

  const lastAtIso = usageRow?.last_message_at ?? null;
  if (lastAtIso) {
    const lastMs = new Date(lastAtIso).getTime();
    if (!Number.isNaN(lastMs) && nowMs - lastMs < cooldownMs) {
      const waitSec = Math.max(
        1,
        Math.ceil((cooldownMs - (nowMs - lastMs)) / 1000),
      );
      return NextResponse.json(
        {
          ok: false,
          error: helpyjiCooldownMessage(waitSec),
          retryAfterSec: waitSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(waitSec) },
        },
      );
    }
  }

  let contextBlock: string;
  const rawCtx = body.context;
  if (looksLikePrepBrainContext(rawCtx)) {
    try {
      const truncated = truncatePrepBrainContextForApi(rawCtx);
      contextBlock = `--- USER PREP CONTEXT (JSON; ground truth) ---\n${JSON.stringify(truncated)}\n--- END PREP CONTEXT ---`;
    } catch (e) {
      console.error("[helpyji/chat] context truncate failed", e);
      return NextResponse.json({ ok: false, error: "Invalid context." }, { status: 400 });
    }
  } else {
    contextBlock =
      '--- USER PREP CONTEXT ---\n{"note":"Full prep snapshot was not sent this turn; rely on commerce context and general guidance."}\n--- END PREP CONTEXT ---';
  }

  const commerceBlock = buildCommerceBlock({
    surface,
    paid,
    tier,
    status: profile?.subscription_status ?? null,
  });

  const systemContent = `${HELPYJI_SYSTEM_PROMPT}

--- SALES SURFACE ---
${surface}

--- USER COMMERCE CONTEXT (JSON; server truth) ---
${commerceBlock}

${contextBlock}`;

  const { error: insertUserErr } = await admin.from("helpyji_conversations").insert({
    user_id: user.id,
    session_id: sessionId,
    message_role: "user",
    content: clipForDb(last.content),
    surface,
  });

  if (insertUserErr) {
    console.error("[helpyji/chat] conversation user insert failed", insertUserErr);
    return NextResponse.json(
      { ok: false, error: "Could not log message. Try again." },
      { status: 500 },
    );
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "HelpyJi is temporarily unavailable. Try again later." },
      { status: 503 },
    );
  }

  const groqMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...messages.map((m) =>
      m.role === "user"
        ? ({ role: "user", content: m.content } as const)
        : ({ role: "assistant", content: m.content } as const),
    ),
  ];

  const models = resolveHelpyjiGroqModels(request);
  const groq = new Groq({ apiKey });
  let assistantText = "";
  let groqModelUsed = "";
  let lastErr: unknown;

  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.55,
        max_tokens: MAX_COMPLETION_TOKENS,
        messages: groqMessages,
      });
      const raw = completion.choices[0]?.message?.content;
      assistantText = typeof raw === "string" ? raw.trim() : "";
      if (assistantText) {
        groqModelUsed = model;
        break;
      }
    } catch (e) {
      lastErr = e;
    }
  }

  if (!assistantText) {
    console.error("[helpyji/chat] Groq error", lastErr);
    return NextResponse.json(
      { ok: false, error: "Could not get a reply. Try again." },
      { status: 502 },
    );
  }

  console.log("[helpyji/chat] groq_model=", groqModelUsed);

  const { error: insertAssistantErr } = await admin.from("helpyji_conversations").insert({
    user_id: user.id,
    session_id: sessionId,
    message_role: "assistant",
    content: clipForDb(assistantText),
    surface,
  });

  if (insertAssistantErr) {
    console.error("[helpyji/chat] conversation assistant insert failed", insertAssistantErr);
  }

  const nextCount = used + 1;
  const { error: usageWriteErr } = await admin.from("helpyji_daily_usage").upsert(
    {
      subject_key: subjectKey,
      day: dayStr,
      message_count: nextCount,
      last_message_at: new Date().toISOString(),
    },
    { onConflict: "subject_key,day" },
  );

  if (usageWriteErr) {
    console.error("[helpyji/chat] usage write failed", usageWriteErr);
  }

  const remaining = Math.max(0, dailyLimit - nextCount);
  return NextResponse.json({
    ok: true,
    message: assistantText,
    limit: dailyLimit,
    remaining,
    groq_model: groqModelUsed,
  });
}
