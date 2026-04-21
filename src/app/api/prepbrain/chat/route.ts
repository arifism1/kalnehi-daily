import { NextResponse } from "next/server";

import { serializePrepBrainToolData } from "@/lib/prepBrainDataSerializer";
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
import { isFreeTrialWindowActive } from "@/lib/freeTrial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { resolvePrepbrainGroqModels } from "@/lib/groqPrepbrainModel";
import { callChatCompletion, type AiChatMessage } from "@/lib/aiChatClient";
import { USER_ERROR } from "@/lib/userFacingErrors";
import {
  buildPrepbrainUsageDisplayPayload,
} from "@/lib/prepbrainTokenAccounting";
import {
  PREPBRAIN_AI_TOKEN_RESERVE_ESTIMATE,
  prepbrainAiTokenCancelReservation,
  prepbrainAiTokenFinalize,
  prepbrainAiTokenReserve,
} from "@/lib/prepbrainAiTokenRpc";
import { prepbrainLimitReachedMessageForUi } from "@/lib/prepbrainLimitUserFacing";
import {
  prepbrainCalendarMonthKey,
  resolveAiUsagePhase,
  type PrepBrainTokenRow,
} from "@/lib/prepbrainTokens";
import {
  persistPrepbrainTurn,
  prepbrainAssertRoomBeforeTurn,
} from "@/lib/prepbrainConversationPersistence";

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
/** Sent to Groq only — keeps prompt cost bounded; full thread may be longer in UI/DB. */
const MAX_CHAT_MESSAGES = 4;
/** Max messages the client may send in one request (trimmed to the most recent). */
const MAX_MESSAGES_IN_REQUEST = 200;
const MAX_MESSAGE_CHARS = 2_500;
/** Short cooldown between chat completions (backed by `prepbrain_chat_cooldown` for multi-instance). */
const MIN_MS_BETWEEN_REQUESTS = 1_200;

/**
 * Groq completion ceiling per reply. A flat low cap truncates mid-sentence (broken Markdown).
 * Higher caps for strategy-heavy intents; tighter for narrow tool-focused intents.
 * Pair with output-efficiency rules in prepBrainPrompts.ts so average completion stays lean.
 */
function maxCompletionTokensForIntent(
  intent: Exclude<PrepBrainIntent, "small_talk">,
): number {
  switch (intent) {
    case "general":
    case "marks_score":
    case "today_plan":
    case "target_score":
    case "weak_vs_strong":
      return 1150;
    case "syllabus_progress":
    case "habits_or_meditation":
    case "study_camera":
      return 850;
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}

type ChatRole = "user" | "assistant";

type IncomingMessage = {
  role: ChatRole;
  content: string;
};

type PrepBrainIntent =
  | "today_plan"
  | "syllabus_progress"
  | "weak_vs_strong"
  | "marks_score"
  | "habits_or_meditation"
  | "study_camera"
  | "target_score"
  | "small_talk"
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

function parseMessagesFull(raw: unknown): IncomingMessage[] | null {
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
  return out.slice(-MAX_MESSAGES_IN_REQUEST);
}

function messagesForModel(full: IncomingMessage[]): IncomingMessage[] {
  return full.slice(-MAX_CHAT_MESSAGES);
}

function parseConversationId(body: Record<string, unknown>): string | null {
  const v = body.conversationId;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      t,
    )
  ) {
    return null;
  }
  return t;
}

/**
 * Onboarding / capability questions must reach the model (not Token Guardian).
 */
function isPrepBrainCapabilityQuestion(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  if (!t) return false;
  return (
    /\bhow can (you|prepbrain|it) help\b/.test(t) ||
    /\bwhat can (you|prepbrain|it) do\b/.test(t) ||
    /\bwhat (are|is) you for\b/.test(t) ||
    /\bwhat do you do\b/.test(t) ||
    /\bwhat('?s| is) prepbrain\b/.test(t) ||
    /\bhow does (this|prepbrain|kalnehi) work\b/.test(t) ||
    /\bprepbrain\b.*\b(do|help|features?)\b/.test(t) ||
    /\b(features?|capabilities)\b.*\b(prepbrain|you|kalnehi)\b/.test(t) ||
    /\b(prepbrain|you)\b.*\b(features?|capabilities)\b/.test(t) ||
    /\bwhat can kalnehi\b/.test(t) ||
    /\bwhat does kalnehi\b/.test(t) ||
    /\bwhat('?s| is) kalnehi\b/.test(t) ||
    /\bwhat can kal\s*nehi\b/.test(t) ||
    /\bwhat does kal\s*nehi\b/.test(t) ||
    /\bwhat('?s| is) kal\s*nehi\b/.test(t) ||
    /\b(tell me about|explain)\s+kalnehi\b/.test(t) ||
    /\b(tell me about|explain)\s+kal\s*nehi\b/.test(t) ||
    /\bkalnehi\b.*\b(features?|do|help|offer|include)\b/.test(t) ||
    /\bkal\s*nehi\b.*\b(features?|do|help|offer|include)\b/.test(t)
  );
}

/**
 * Skepticism about needing PrepBrain / the app — must reach the model for a substantive reply.
 */
function isPrepBrainValueChallengeQuestion(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  if (!t) return false;
  return (
    /\b(i|we)\s+(can|could)\b.*\bwithout\s+(you|prepbrain|kalnehi|this\s+app|the\s+app)\b/.test(t) ||
    /\b(don'?t|do not)\s+need\s+(you|prepbrain|kalnehi|this|the app|an?\s+ai)\b/.test(t) ||
    /\bno\s+need\s+for\s+(you|prepbrain|kalnehi|this|an?\s+ai)\b/.test(t) ||
    /\bwhy\s+(should|do|would)\s+i\s+(use|need|bother\s+with)(\s+(you|prepbrain|kalnehi|this|the app))?\b/.test(
      t,
    ) ||
    /\bwhat('?s| is)\s+the\s+point\b.*\b(you|prepbrain|kalnehi|this|ai|chat)\b/.test(t) ||
    /\b(not\s+worth|waste\s+of\s+time|useless|unnecessary)\b.*\b(you|prepbrain|kalnehi|this\s+chat)\b/.test(t) ||
    /\b(you|prepbrain)\s+(are|is)\s+(useless|unnecessary|pointless)\b/.test(t)
  );
}

/**
 * Returns true for messages that are pure fluff with zero study value:
 * bare greetings, flattery, joke requests, or "who are you" openers.
 * Conservative — only blocks messages where the ENTIRE message is irrelevant,
 * so "hi, what should I study today?" correctly passes through.
 */
function isSmallTalk(msg: string): boolean {
  if (isPrepBrainCapabilityQuestion(msg) || isPrepBrainValueChallengeQuestion(msg)) return false;

  const t = msg.trim();

  // Purely a greeting with no study context
  if (/^(hi+|hello+|hey+|yo+|sup|hiya|howdy|greetings|good\s+(morning|afternoon|evening|night)|namaste)[!?.,\s]*$/i.test(t)) return true;

  // Flattery / ego-stroking
  if (/(you('re| are)\s+(so\s+)?(smart|amazing|great|awesome|brilliant|the best|genius|intelligent|perfect|cool)|smartest ai|best ai|you rock|i love you|love you prepbrain)/i.test(t)) return true;

  // Explicit joke / entertainment requests
  if (/\btell (me )?a joke\b|\bcrack a joke\b|\bsay something funny\b|\bmake me laugh\b/i.test(t)) return true;

  // "Who/what are you" standalone queries (capability phrasing excluded above)
  if (/^(who (are|made) you|what('?s| is) your name|are you (an?\s+)?ai|are you human)[!?.,\s]*$/i.test(t)) return true;

  return false;
}

function detectPrepBrainIntent(lastUserMessage: string): PrepBrainIntent {
  if (isSmallTalk(lastUserMessage)) return "small_talk";

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
  if (
    t.includes("habit") ||
    t.includes("streak") ||
    t.includes("meditation") ||
    t.includes("stress") ||
    t.includes("burnout") ||
    t.includes("sleep") ||
    t.includes("anxiety") ||
    t.includes("overwhelm") ||
    t.includes("tired") ||
    t.includes("brain yoga") ||
    t.includes("wellness") ||
    t.includes("calm") ||
    t.includes("breathe") ||
    t.includes("breathing") ||
    t.includes("rest") ||
    t.includes("mental health") ||
    t.includes("exhausted") ||
    t.includes("drained")
  ) {
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
 * Body: { messages: { role, content }[], conversationId?: string }.
 * Only the last few messages are sent to the model; the full array may be longer for UI history.
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

  const fullMessages = parseMessagesFull(body.messages);
  if (!fullMessages) {
    return NextResponse.json(
      { ok: false, error: "messages[] required with non-empty user/assistant entries." },
      { status: 400 },
    );
  }

  const conversationIdIn = parseConversationId(body);

  const last = fullMessages[fullMessages.length - 1];
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
      "subscription_status,subscription_end_date,trial_started_at," +
      "ai_tokens_used,ai_tokens_month,welcome_ai_tokens_used,paid_trial_ai_tokens_used," +
      "bonus_ai_tokens_ledger,primary_exam,target_exam,cuet_domain_subjects,upsc_optional_subjects",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error(
      "[prepbrain/chat] profile read failed",
      profileErr.code,
      profileErr.message,
      profileErr.details,
    );
    return NextResponse.json(
      { ok: false, error: "Could not load your account. Please try again." },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "PrepBrain AI requires a Kalnehi account." },
      { status: 403 },
    );
  }

  const paid = isCurrentlyPaid(
    profile.subscription_status ?? null,
    profile.subscription_end_date ?? null,
  );
  const trialStarted =
    typeof profile.trial_started_at === "string" ? profile.trial_started_at : null;
  const welcomeTrialActive =
    Boolean(trialStarted) && !paid && isFreeTrialWindowActive(trialStarted);

  const phase = resolveAiUsagePhase({
    hasPaidSubscriptionAccess: paid,
    subscriptionStatus: profile.subscription_status ?? null,
    welcomeTrialActive,
  });

  if (phase === "none") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "PrepBrain AI is available during your 1-day free trial and with an active Pro subscription.",
      },
      { status: 403 },
    );
  }

  const room = await prepbrainAssertRoomBeforeTurn(
    admin,
    user.id,
    conversationIdIn,
  );
  if (!room.ok) {
    return NextResponse.json(
      { ok: false, error: room.error },
      { status: room.status },
    );
  }

  const monthKey = prepbrainCalendarMonthKey();
  const now = new Date();
  const welcomeUsed =
    typeof profile.welcome_ai_tokens_used === "number" ? profile.welcome_ai_tokens_used : 0;
  const paidTrialUsed =
    typeof profile.paid_trial_ai_tokens_used === "number"
      ? profile.paid_trial_ai_tokens_used
      : 0;
  const tokenRow: PrepBrainTokenRow = {
    ai_tokens_used: profile.ai_tokens_used,
    ai_tokens_month: profile.ai_tokens_month,
    welcome_ai_tokens_used: welcomeUsed,
    paid_trial_ai_tokens_used: paidTrialUsed,
  };

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

  const intent = detectPrepBrainIntent(last.content);

  // Token Guardian — return instantly for small talk without spending any model tokens.
  if (intent === "small_talk") {
    await touchPrepbrainCooldown(admin, user.id);
    const assistantSmallTalk =
      "Let's save your tokens for questions that actually help you crack your exam! Ask me about your syllabus, weak chapters, daily plan, or study strategy.";
    let conversationOut: string | null = conversationIdIn;
    const persistSt = await persistPrepbrainTurn({
      admin,
      userId: user.id,
      conversationId: conversationIdIn,
      userContent: last.content,
      assistantContent: assistantSmallTalk,
    });
    if (persistSt.ok) {
      conversationOut = persistSt.conversationId;
    } else if (!persistSt.ok && persistSt.status === 400) {
      return NextResponse.json(
        { ok: false, error: persistSt.error },
        { status: 400 },
      );
    } else {
      console.error("[prepbrain/chat] small_talk persist failed", persistSt);
    }
    return NextResponse.json({
      ok: true,
      message: assistantSmallTalk,
      conversation_id: conversationOut,
      groq_model: "token-guardian",
      intent,
      tools_used: [],
      cache_sources: {},
      usage: buildPrepbrainUsageDisplayPayload(
        phase,
        tokenRow,
        monthKey,
        profile.bonus_ai_tokens_ledger,
        now,
      ),
    });
  }

  const selectedTools = selectToolsForIntent(intent);

  const marksLimit = 10;

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
  const toolData = Object.fromEntries(toolResultsRaw) as Record<string, unknown>;
  const toolDataMarkdown = serializePrepBrainToolData(toolData);

  const toolDataChars = toolDataMarkdown.length;
  const toolDataEstTokens = Math.ceil(toolDataChars / 4);

  // Intent-aware system prompt: omits ~100-token marks module for non-marks intents.
  const systemPrompt = buildPrepBrainSystemPrompt(intent);
  const systemContent = `${systemPrompt}\n\n--- USER PREP DATA ---\n${toolDataMarkdown}\n--- END USER PREP DATA ---`;

  const modelMessages = messagesForModel(fullMessages);

  const aiMessages: AiChatMessage[] = [
    { role: "system", content: systemContent },
    ...modelMessages.map((m) => ({ role: m.role, content: m.content } as AiChatMessage)),
  ];

  const models = resolvePrepbrainGroqModels({ request, user });

  const reserve = await prepbrainAiTokenReserve(admin, user.id);
  if (!reserve.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          reserve.code === "insufficient_ai_tokens"
            ? prepbrainLimitReachedMessageForUi(phase)
            : "PrepBrain AI is unavailable for your account.",
        usage: buildPrepbrainUsageDisplayPayload(
          phase,
          tokenRow,
          monthKey,
          profile.bonus_ai_tokens_ledger,
          now,
        ),
      },
      { status: 403 },
    );
  }
  const reservationId = reserve.reservationId;

  let assistantText = "";
  let groqModelUsed = "";
  let groqTotalTokens = 0;
  let groqPromptTokens = 0;
  let groqCompletionTokens = 0;

  const maxCompletionTokens = maxCompletionTokensForIntent(intent);

  try {
    const result = await callChatCompletion(models, aiMessages, {
      temperature: 0.65,
      max_tokens: maxCompletionTokens,
    });
    assistantText = result.text;
    groqModelUsed = result.modelUsed;
    groqTotalTokens = result.totalTokens;
    groqPromptTokens = result.promptTokens;
    groqCompletionTokens = result.completionTokens;
  } catch (e) {
    await prepbrainAiTokenCancelReservation(admin, user.id, reservationId);
    console.error("[prepbrain/chat] AI error", e);
    return NextResponse.json(
      { ok: false, error: "Could not get a response. Try again." },
      { status: 502 },
    );
  }

  if (!assistantText) {
    await prepbrainAiTokenCancelReservation(admin, user.id, reservationId);
    console.error("[prepbrain/chat] AI returned empty content");
    return NextResponse.json(
      { ok: false, error: "Could not get a response. Try again." },
      { status: 502 },
    );
  }

  await touchPrepbrainCooldown(admin, user.id);

  console.log(
    "[prepbrain/chat] model=%s intent=%s max_completion_tokens=%d tools=%s cache=%s redis=%s prompt_tokens=%d completion_tokens=%d total_tokens=%d tool_chars=%d tool_est_tokens=%d",
    groqModelUsed,
    intent,
    maxCompletionTokens,
    selectedTools.join(","),
    selectedTools.map((t) => toolCacheSources[t] ?? "?").join(","),
    isRedisConfigured() ? "yes" : "no",
    groqPromptTokens,
    groqCompletionTokens,
    groqTotalTokens,
    toolDataChars,
    toolDataEstTokens,
  );

  const actualRaw = Math.max(0, Math.floor(groqTotalTokens));
  const promptComp = groqPromptTokens + groqCompletionTokens;
  const billed =
    actualRaw > 0 ? actualRaw : promptComp > 0 ? promptComp : PREPBRAIN_AI_TOKEN_RESERVE_ESTIMATE;

  const fin = await prepbrainAiTokenFinalize(admin, user.id, reservationId, billed);
  if (!fin.ok) {
    console.error("[prepbrain/chat] token finalize failed");
  }

  const persistNow = new Date();
  const { data: profileAfter } = await admin
    .from("user_profiles")
    .select(
      "ai_tokens_used,ai_tokens_month,welcome_ai_tokens_used,paid_trial_ai_tokens_used,bonus_ai_tokens_ledger",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const usageAfter = profileAfter
    ? buildPrepbrainUsageDisplayPayload(
        phase,
        {
          ai_tokens_used: profileAfter.ai_tokens_used,
          ai_tokens_month: profileAfter.ai_tokens_month,
          welcome_ai_tokens_used:
            typeof profileAfter.welcome_ai_tokens_used === "number"
              ? profileAfter.welcome_ai_tokens_used
              : 0,
          paid_trial_ai_tokens_used:
            typeof profileAfter.paid_trial_ai_tokens_used === "number"
              ? profileAfter.paid_trial_ai_tokens_used
              : 0,
        },
        monthKey,
        profileAfter.bonus_ai_tokens_ledger,
        persistNow,
      )
    : buildPrepbrainUsageDisplayPayload(
        phase,
        tokenRow,
        monthKey,
        profile.bonus_ai_tokens_ledger,
        persistNow,
      );

  let conversationOut: string | null = conversationIdIn;
  const persistResult = await persistPrepbrainTurn({
    admin,
    userId: user.id,
    conversationId: conversationIdIn,
    userContent: last.content,
    assistantContent: assistantText,
  });
  if (persistResult.ok) {
    conversationOut = persistResult.conversationId;
  } else if (!persistResult.ok && persistResult.status === 400) {
    return NextResponse.json(
      { ok: false, error: persistResult.error, usage: usageAfter },
      { status: 400 },
    );
  } else {
    console.error("[prepbrain/chat] persist failed", persistResult);
  }

  return NextResponse.json({
    ok: true,
    message: assistantText,
    conversation_id: conversationOut,
    usage: usageAfter,
    groq_model: groqModelUsed,
    intent,
    tools_used: selectedTools,
    cache_sources: toolCacheSources,
    prompt_size: {
      tool_chars: toolDataChars,
      tool_est_tokens: toolDataEstTokens,
    },
  });
}
