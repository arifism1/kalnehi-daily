import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { NextResponse } from "next/server";

import { buildPrepBrainSystemPrompt } from "@/lib/prepBrainPrompts";
import {
  fetchSyllabusSubjectCompletion,
  getHabitStreakSummary,
  getMarksIntelligence,
  getMeditationConsistency,
  getRecentStudyCameraData,
  getSyllabusOverview,
  getTargetScoreBlueprint,
  getTodayPlan,
  getWeakStrongSubjects,
  type PrepbrainPrefetchedProfile,
  type PrepbrainToolName,
} from "@/lib/prepbrainToolQueries";
import {
  isRedisConfigured,
  redisToolGet,
  redisToolSet,
} from "@/lib/prepbrainRedisCache";
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

/**
 * Per-user, per-tool in-memory cache for Fluid Compute instance reuse.
 * Prevents redundant DB round-trips when a user sends multiple messages
 * in quick succession (very common in chat flows).
 * TTL is intentionally short (45s) to stay fresh while cutting costs.
 */
const TOOL_CACHE_TTL_MS = 45_000;
const toolDataCache = new Map<string, { result: unknown; cachedAt: number }>();

function toolCacheGet(userId: string, tool: string): unknown {
  const entry = toolDataCache.get(`${userId}:${tool}`);
  if (!entry || Date.now() - entry.cachedAt > TOOL_CACHE_TTL_MS) return undefined;
  return entry.result;
}

function toolCacheSet(userId: string, tool: string, result: unknown): void {
  toolDataCache.set(`${userId}:${tool}`, { result, cachedAt: Date.now() });
  // Prevent unbounded memory growth on long-lived instances
  if (toolDataCache.size > 2_000) {
    const now = Date.now();
    for (const [k, v] of toolDataCache) {
      if (now - v.cachedAt > TOOL_CACHE_TTL_MS) toolDataCache.delete(k);
    }
  }
}

const MAX_BODY_BYTES = 512_000;
const MAX_CHAT_MESSAGES = 4;
const MAX_MESSAGE_CHARS = 2_500;
const MAX_COMPLETION_TOKENS_CONCISE = 220;
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
  | "marks_score"
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
    t.includes("mark") ||
    t.includes("score") ||
    t.includes("weightage") ||
    t.includes("focus on") ||
    t.includes("what to study") ||
    t.includes("priority") ||
    t.includes("priorit") ||
    t.includes("improve") ||
    t.includes("how many") ||
    t.includes("rank")
  ) {
    return "marks_score";
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
    case "marks_score":
      return ["getMarksIntelligence", "getWeakStrongSubjects"];
    case "syllabus_progress":
      return ["getSyllabusOverview", "getWeakStrongSubjects"];
    case "weak_vs_strong":
      return ["getWeakStrongSubjects", "getMarksIntelligence"];
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

type SyllabusStats = Awaited<ReturnType<typeof fetchSyllabusSubjectCompletion>>;

async function runToolByName(
  tool: PrepbrainToolName,
  admin: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  userId: string,
  prefetchedProfile: PrepbrainPrefetchedProfile,
  prefetchedSyllabusStats: SyllabusStats | undefined,
  marksLimit: number,
) {
  switch (tool) {
    case "getTodayPlan":
      return getTodayPlan(admin, userId);
    case "getSyllabusOverview":
      return getSyllabusOverview(admin, userId, prefetchedProfile, prefetchedSyllabusStats);
    case "getWeakStrongSubjects":
      return getWeakStrongSubjects(admin, userId, prefetchedProfile, prefetchedSyllabusStats);
    case "getMarksIntelligence":
      return getMarksIntelligence(admin, userId, prefetchedProfile, marksLimit);
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
      "subscription_status, subscription_end_date, subscription_tier, prepbrain_tokens_used, prepbrain_tokens_month, primary_exam, target_exam, cuet_domain_subjects, upsc_optional_subjects",
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

  // Mode detection moved before tool execution so marksLimit can be derived.
  const responseMode = detectPrepBrainMode(last.content);
  // Concise mode: 6 rows (~100 tokens); deep mode: 10 rows.
  const marksLimit = responseMode === "deep" ? 10 : 6;

  // Prefetched profile — passed to tool queries to eliminate redundant DB calls.
  // We cast because Supabase types may lag the actual column select.
  const profileAny = profile as Record<string, unknown>;
  const prefetchedProfile: PrepbrainPrefetchedProfile = {
    primary_exam: (profileAny.primary_exam as string | null | undefined) ?? null,
    target_exam: (profileAny.target_exam as string | null | undefined) ?? null,
    cuet_domain_subjects: (profileAny.cuet_domain_subjects as string | null | undefined) ?? null,
    upsc_optional_subjects: profileAny.upsc_optional_subjects ?? null,
  };

  // Pre-fetch syllabus stats once if multiple syllabus tools need them.
  const syllabusToolNames: PrepbrainToolName[] = ["getSyllabusOverview", "getWeakStrongSubjects"];
  const syllabusToolsNeeded = selectedTools.filter((t) => syllabusToolNames.includes(t));
  let prefetchedSyllabusStats: SyllabusStats | undefined;
  if (syllabusToolsNeeded.length >= 2) {
    const syllabusStatsCacheKey = "getSyllabusStats";
    const memHit = toolCacheGet(user.id, syllabusStatsCacheKey);
    if (memHit !== undefined) {
      prefetchedSyllabusStats = memHit as SyllabusStats;
    } else {
      const redisHit = await redisToolGet(user.id, syllabusStatsCacheKey);
      if (redisHit !== undefined) {
        prefetchedSyllabusStats = redisHit as SyllabusStats;
        toolCacheSet(user.id, syllabusStatsCacheKey, prefetchedSyllabusStats);
      } else {
        try {
          prefetchedSyllabusStats = await fetchSyllabusSubjectCompletion(admin, user.id, prefetchedProfile);
          toolCacheSet(user.id, syllabusStatsCacheKey, prefetchedSyllabusStats);
          void redisToolSet(user.id, syllabusStatsCacheKey, prefetchedSyllabusStats);
        } catch (e) {
          console.error("[prepbrain/chat] prefetch syllabus stats failed", e);
        }
      }
    }
  }

  // Cache lookup order: in-memory (45s) → Redis (2-10 min) → Supabase.
  const toolCacheSources: Record<string, "memory" | "redis" | "supabase"> = {};
  const toolResultsRaw = await Promise.all(
    selectedTools.map(async (tool) => {
      // 1. In-memory cache (same instance, zero network)
      const memCached = toolCacheGet(user.id, tool);
      if (memCached !== undefined) {
        toolCacheSources[tool] = "memory";
        return [tool, memCached] as const;
      }
      // 2. Redis cache (cross-instance, 2-10 min TTL)
      const redisCached = await redisToolGet(user.id, tool);
      if (redisCached !== undefined) {
        toolCacheSources[tool] = "redis";
        toolCacheSet(user.id, tool, redisCached); // warm in-memory for this instance
        return [tool, redisCached] as const;
      }
      // 3. Supabase (cold miss)
      toolCacheSources[tool] = "supabase";
      try {
        const result = await runToolByName(tool, admin, user.id, prefetchedProfile, prefetchedSyllabusStats, marksLimit);
        toolCacheSet(user.id, tool, result);
        void redisToolSet(user.id, tool, result);
        return [tool, result] as const;
      } catch (e) {
        console.error(`[prepbrain/chat] tool ${tool} failed`, e);
        return [tool, { error: "unavailable" }] as const;
      }
    }),
  );
  const toolData = Object.fromEntries(toolResultsRaw);
  const toolDataJson = JSON.stringify(toolData);

  const toolDataChars = toolDataJson.length;
  const toolDataEstTokens = Math.ceil(toolDataChars / 4);

  const modeInstruction =
    responseMode === "concise"
      ? CONCISE_MODE_INSTRUCTION
      : "Deep mode: user explicitly requested detail. You may provide a fuller strategy, but stay practical, structured, and focused on actions.";
  // Intent-aware system prompt: omits ~100-token marks module for non-marks intents.
  const systemPrompt = buildPrepBrainSystemPrompt(intent);
  const systemContent = `${systemPrompt}\n\n--- RESPONSE MODE ---\n${modeInstruction}\n\n--- TOOL-DERIVED USER DATA (JSON; use only what is relevant) ---\n${toolDataJson}\n--- END TOOL DATA ---`;

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
    "[prepbrain/chat] model=%s mode=%s intent=%s tools=%s cache=%s redis=%s prompt_tokens=%d completion_tokens=%d total_tokens=%d tool_chars=%d tool_est_tokens=%d marks_limit=%d",
    groqModelUsed,
    responseMode,
    intent,
    selectedTools.join(","),
    selectedTools.map((t) => toolCacheSources[t] ?? "?").join(","),
    isRedisConfigured() ? "yes" : "no",
    groqPromptTokens,
    groqCompletionTokens,
    groqTotalTokens,
    toolDataChars,
    toolDataEstTokens,
    marksLimit,
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
    cache_sources: toolCacheSources,
    prompt_size: {
      tool_chars: toolDataChars,
      tool_est_tokens: toolDataEstTokens,
      marks_limit: marksLimit,
    },
  });
}
