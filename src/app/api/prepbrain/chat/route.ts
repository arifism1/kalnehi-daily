import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { NextResponse } from "next/server";

import { PREPBRAIN_SYSTEM_PROMPT } from "@/lib/prepBrainPrompts";
import {
  getHabitStreakSummary,
  getMeditationConsistency,
  getRecentStudyCameraData,
  getSyllabusOverview,
  getTargetScoreBlueprint,
  getTodayPlan,
  getWeakStrongSubjects,
  type PrepbrainToolName,
} from "@/lib/prepbrainToolQueries";
import { parseSubscriptionTier } from "@/lib/subscriptionTiers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { resolvePrepbrainGroqModels } from "@/lib/groqPrepbrainModel";
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
const MAX_CHAT_MESSAGES = 6;
const MAX_MESSAGE_CHARS = 2_500;
const MAX_COMPLETION_TOKENS_CONCISE = 340;
const MAX_COMPLETION_TOKENS_DEEP = 700;
/** Short cooldown between chat completions (backed by `prepbrain_chat_cooldown` for multi-instance). */
const MIN_MS_BETWEEN_REQUESTS = 1_200;
const CONCISE_MODE_INSTRUCTION =
  "You are a concise and practical exam prep coach. Give direct, actionable advice. Keep replies under 120-150 words unless the user asks for detailed explanation or strategy.";

type ChatRole = "user" | "assistant";

type IncomingMessage = {
  role: ChatRole;
  content: string;
};

type PrepBrainResponseMode = "concise" | "deep";
type PrepBrainIntent =
  | "today_plan"
  | "syllabus_progress"
  | "weak_vs_strong"
  | "habits_or_meditation"
  | "study_camera"
  | "target_score"
  | "general";

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

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

async function prepbrainCooldownRemainMs(
  admin: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  userId: string,
): Promise<number> {
  const { data, error } = await admin
    .from("prepbrain_chat_cooldown")
    .select("last_request_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[prepbrain/chat] cooldown read failed", error);
    return 0;
  }
  const raw = data?.last_request_at;
  if (!raw) return 0;
  const lastMs = new Date(raw).getTime();
  if (Number.isNaN(lastMs)) return 0;
  const elapsed = Date.now() - lastMs;
  return Math.max(0, MIN_MS_BETWEEN_REQUESTS - elapsed);
}

async function touchPrepbrainCooldown(
  admin: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin.from("prepbrain_chat_cooldown").upsert(
    { user_id: userId, last_request_at: now },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("[prepbrain/chat] cooldown upsert failed", error);
  }
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

function detectPrepBrainMode(lastUserMessage: string): PrepBrainResponseMode {
  const t = lastUserMessage.toLowerCase();
  const deepSignals = [
    "explain in detail",
    "detailed",
    "detailed plan",
    "full strategy",
    "deep analysis",
    "step by step",
    "break it down",
    "comprehensive",
    "thorough",
    "long answer",
  ];
  return deepSignals.some((signal) => t.includes(signal)) ? "deep" : "concise";
}

function detectPrepBrainIntent(lastUserMessage: string): PrepBrainIntent {
  const t = lastUserMessage.toLowerCase();
  if (
    t.includes("today") ||
    t.includes("daily plan") ||
    t.includes("today plan") ||
    t.includes("schedule")
  ) {
    return "today_plan";
  }
  if (
    t.includes("weak") ||
    t.includes("strong") ||
    t.includes("subject") ||
    t.includes("chapter")
  ) {
    return "weak_vs_strong";
  }
  if (
    t.includes("syllabus") ||
    t.includes("progress") ||
    t.includes("completion")
  ) {
    return "syllabus_progress";
  }
  if (t.includes("habit") || t.includes("streak") || t.includes("meditation")) {
    return "habits_or_meditation";
  }
  if (
    t.includes("camera") ||
    t.includes("study session") ||
    t.includes("focus proof")
  ) {
    return "study_camera";
  }
  if (
    t.includes("target") ||
    t.includes("score blueprint") ||
    t.includes("blueprint")
  ) {
    return "target_score";
  }
  return "general";
}

function selectToolsForIntent(intent: PrepBrainIntent): PrepbrainToolName[] {
  switch (intent) {
    case "today_plan":
      return ["getTodayPlan", "getWeakStrongSubjects"];
    case "syllabus_progress":
      return ["getSyllabusOverview", "getWeakStrongSubjects"];
    case "weak_vs_strong":
      return ["getWeakStrongSubjects", "getSyllabusOverview"];
    case "habits_or_meditation":
      return ["getHabitStreakSummary", "getMeditationConsistency"];
    case "study_camera":
      return ["getRecentStudyCameraData", "getTodayPlan"];
    case "target_score":
      return ["getTargetScoreBlueprint", "getSyllabusOverview"];
    default:
      return ["getTodayPlan", "getSyllabusOverview"];
  }
}

async function runToolByName(
  tool: PrepbrainToolName,
  admin: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  userId: string,
) {
  switch (tool) {
    case "getTodayPlan":
      return getTodayPlan(admin, userId);
    case "getSyllabusOverview":
      return getSyllabusOverview(admin, userId);
    case "getWeakStrongSubjects":
      return getWeakStrongSubjects(admin, userId);
    case "getHabitStreakSummary":
      return getHabitStreakSummary(admin, userId);
    case "getMeditationConsistency":
      return getMeditationConsistency(admin, userId);
    case "getRecentStudyCameraData":
      return getRecentStudyCameraData(admin, userId);
    case "getTargetScoreBlueprint":
      return getTargetScoreBlueprint(admin, userId);
    default:
      return null;
  }
}

/**
 * POST /api/prepbrain/chat
 * Body: { messages: { role, content }[] }.
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

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .select(
      "subscription_status, subscription_end_date, subscription_tier, prepbrain_tokens_used, prepbrain_tokens_month",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("[prepbrain/chat] profile read failed", profileErr);
    return NextResponse.json(
      { ok: false, error: "Could not load your account. Please try again." },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "PrepBrain AI requires an active Pro or Pro Max plan." },
      { status: 403 },
    );
  }

  const paid = isCurrentlyPaid(
    profile.subscription_status ?? null,
    profile.subscription_end_date ?? null,
  );
  const tier = parseSubscriptionTier(profile.subscription_tier ?? undefined);
  if (!paid || (tier !== "pro" && tier !== "pro_max")) {
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

  const remainMs = await prepbrainCooldownRemainMs(admin, user.id);
  if (remainMs > 0) {
    const retrySec = Math.max(1, Math.ceil(remainMs / 1000));
    return NextResponse.json(
      { ok: false, error: "Please wait a moment before sending again." },
      {
        status: 429,
        headers: { "Retry-After": String(retrySec) },
      },
    );
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

  const intent = detectPrepBrainIntent(last.content);
  const selectedTools = selectToolsForIntent(intent);
  const toolResultsRaw = await Promise.all(
    selectedTools.map(async (tool) => {
      try {
        const result = await runToolByName(tool, admin, user.id);
        return [tool, result] as const;
      } catch (e) {
        console.error(`[prepbrain/chat] tool ${tool} failed`, e);
        return [tool, { error: "unavailable" }] as const;
      }
    }),
  );
  const toolData = Object.fromEntries(toolResultsRaw);
  const toolDataJson = JSON.stringify(toolData);

  const oldContextChars =
    isRecord(body.context) ? JSON.stringify(body.context).length : 0;
  const newToolDataChars = toolDataJson.length;
  const oldApproxPromptTokens = Math.ceil(oldContextChars / 4);
  const newApproxPromptTokens = Math.ceil(newToolDataChars / 4);

  const responseMode = detectPrepBrainMode(last.content);
  const modeInstruction =
    responseMode === "concise"
      ? CONCISE_MODE_INSTRUCTION
      : "Deep mode: user explicitly requested detail. You may provide a fuller strategy, but stay practical, structured, and focused on actions.";
  const systemContent = `${PREPBRAIN_SYSTEM_PROMPT}\n\n--- RESPONSE MODE ---\n${modeInstruction}\n\n--- TOOL-DERIVED USER DATA (JSON; use only what is relevant) ---\n${toolDataJson}\n--- END TOOL DATA ---`;

  const groqMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...messages.map((m) =>
      m.role === "user"
        ? ({ role: "user", content: m.content } as const)
        : ({ role: "assistant", content: m.content } as const),
    ),
  ];

  const models = resolvePrepbrainGroqModels({ request, user });

  let assistantText = "";
  let groqModelUsed = "";
  let lastErr: unknown;
  let groqTotalTokens = 0;
  let groqPromptTokens = 0;
  let groqCompletionTokens = 0;
  const groq = new Groq({ apiKey });
  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.65,
        max_tokens:
          responseMode === "deep"
            ? MAX_COMPLETION_TOKENS_DEEP
            : MAX_COMPLETION_TOKENS_CONCISE,
        messages: groqMessages,
      });
      const raw = completion.choices[0]?.message?.content;
      assistantText = typeof raw === "string" ? raw.trim() : "";
      const u = completion.usage;
      groqPromptTokens = u?.prompt_tokens ?? 0;
      groqCompletionTokens = u?.completion_tokens ?? 0;
      groqTotalTokens =
        u?.total_tokens ??
        (u?.prompt_tokens ?? 0) + (u?.completion_tokens ?? 0);
      if (assistantText) {
        groqModelUsed = model;
        break;
      }
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

  await touchPrepbrainCooldown(admin, user.id);

  console.log(
    "[prepbrain/chat] model=%s mode=%s intent=%s tools=%s prompt_tokens=%d completion_tokens=%d total_tokens=%d old_context_chars=%d new_tool_chars=%d old_ctx_est_tokens=%d new_tool_est_tokens=%d",
    groqModelUsed,
    responseMode,
    intent,
    selectedTools.join(","),
    groqPromptTokens,
    groqCompletionTokens,
    groqTotalTokens,
    oldContextChars,
    newToolDataChars,
    oldApproxPromptTokens,
    newApproxPromptTokens,
  );

  const delta = Math.max(0, Math.floor(groqTotalTokens));
  const nextUsed = effectiveUsed + delta;
  const { error: tokenPersistErr } = await admin
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

  return NextResponse.json({
    ok: true,
    message: assistantText,
    usage: usageAfter,
    groq_model: groqModelUsed,
    mode: responseMode,
    intent,
    tools_used: selectedTools,
    prompt_size: {
      old_context_chars: oldContextChars,
      new_tool_chars: newToolDataChars,
      old_context_est_tokens: oldApproxPromptTokens,
      new_tool_est_tokens: newApproxPromptTokens,
    },
  });
}
