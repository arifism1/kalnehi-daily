import { after, NextResponse } from "next/server";

import type { Tables } from "@/types/supabase";

import { serializePrepBrainToolData } from "@/lib/prepBrainDataSerializer";
import { PREPBRAIN_SYSTEM_PROMPT } from "@/lib/prepBrainPrompts";
import {
  fetchSyllabusSubjectCompletion,
  getDailyDebriefSnapshot,
  getHabitStreakSummary,
  getLatestMockScores,
  getMarksIntelligence,
  getMeditationConsistency,
  getMissedTasksContext,
  getMockTrendBySubject,
  getRecentStudyCameraData,
  getRevisionQueueSnapshot,
  getStudyTimerStats,
  getSyllabusBacklogSnapshot,
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
import { isFreeTrialWindowActive, isPaidSubscriptionAccess } from "@/lib/freeTrial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { resolvePrepbrainGroqModels } from "@/lib/groqPrepbrainModel";
import {
  callChatCompletion,
  callStreamingChatCompletion,
  type AiChatMessage,
  type ModelCandidate,
} from "@/lib/aiChatClient";
import { USER_ERROR } from "@/lib/userFacingErrors";
import {
  buildPrepbrainUsageDisplayPayload,
  computePrepbrainTokenPersist,
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
import { prepbrainMonthKeyFromSubscriptionStart } from "@/lib/subscriptionUsage";
import {
  persistPrepbrainTurn,
  prepbrainAssertRoomBeforeTurn,
} from "@/lib/prepbrainConversationPersistence";
import {
  detectConversationThread,
  detectPrepBrainIntent,
  selectToolsForIntent,
  type PrepBrainIntent,
} from "@/lib/prepbrainIntentRouting";

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
// We send last 7 messages + conversation summary for better continuity on 8B model
const MAX_CHAT_MESSAGES = 7;
/** Max messages the client may send in one request (trimmed to the most recent). */
const MAX_MESSAGES_IN_REQUEST = 200;
const MAX_MESSAGE_CHARS = 2_500;
/** Short cooldown between chat completions (backed by `prepbrain_chat_cooldown` for multi-instance). */
const MIN_MS_BETWEEN_REQUESTS = 1_200;

/**
 * Model completion ceiling per reply.
 * Higher caps for strategy-heavy intents; tighter for narrow tool-focused intents.
 */
function maxCompletionTokensForIntent(
  intent: Exclude<PrepBrainIntent, "small_talk">,
): number {
  switch (intent) {
    case "general":
    case "no_data":
    case "marks_score":
    case "today_plan":
    case "target_score":
    case "weak_vs_strong":
    case "revision":
    case "mock_test":
    case "syllabus_backlog":
    case "avoided_topics":
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
    case "getMissedTasksContext":
      return getMissedTasksContext(admin, userId);
    case "getRevisionQueueSnapshot":
      return getRevisionQueueSnapshot(admin, userId);
    case "getLatestMockScores":
      return getLatestMockScores(admin, userId);
    case "getSyllabusBacklogSnapshot":
      return getSyllabusBacklogSnapshot(admin, userId);
    case "getDailyDebriefSnapshot":
      return getDailyDebriefSnapshot(admin, userId);
    case "getMockTrendBySubject":
      return getMockTrendBySubject(admin, userId);
    case "getStudyTimerStats":
      return getStudyTimerStats(admin, userId);
    default:
      return null;
  }
}

/**
 * Generates a compact conversation summary for messages beyond the 7-message model window.
 * Runs in parallel with tool fetching; failures are non-fatal (returns "").
 *
 * @param messages - Full conversation history from the client.
 * @param models - Model candidates (DeepInfra primary → Groq fallback).
 * @returns Formatted summary block, or "" if conversation is short or summarisation fails.
 */
async function createConversationSummary(
  messages: IncomingMessage[],
  models: ModelCandidate[],
): Promise<{ text: string; tokens: number }> {
  // No history beyond the model window — nothing to summarise.
  if (messages.length <= 7) return { text: "", tokens: 0 };

  const recent = messages.slice(-15);
  const transcript = recent
    .map((m) => `${m.role}: ${m.content.substring(0, 240)}...`)
    .join("\n");

  const summaryPrompt =
    `Summarise the conversation history in 6-8 high-value bullet points. Focus especially on:\n` +
    `- Specific syllabus chapters, subjects, or microtopics mentioned (weak/strong)\n` +
    `- Target scores, score gaps, desired rank, or blueprint discussions\n` +
    `- Revision plans, daily plans, focus areas, or prioritization\n` +
    `- User emotional state or concerns (burnout, anxiety, overwhelm, motivation, confidence)\n` +
    `- Any decisions, requests, or commitments made\n` +
    `- Key numbers or percentages discussed\n\n` +
    `Be precise, factual, and actionable for future coaching.\n\n` +
    transcript;

  try {
    const result = await callChatCompletion(
      models,
      [{ role: "user", content: summaryPrompt }],
      { temperature: 0.3, max_tokens: 220 },
    );

    const summaryText = result.text?.trim();
    if (!summaryText || summaryText.length < 30) return { text: "", tokens: 0 };

    return {
      text:
        "=== RECENT CONVERSATION SUMMARY ===\n" +
        summaryText +
        "\n=== END SUMMARY ===\n\n",
      tokens: Math.max(0, Math.floor(result.totalTokens)),
    };
  } catch (err) {
    // Non-fatal — the main reply proceeds without the summary.
    console.warn("[prepbrain/chat] conversation summary failed (non-fatal):", err);
    return { text: "", tokens: 0 };
  }
}

/**
 * Derives a short "Recent Trends" summary from already-fetched tool data.
 * No DB call — pure in-memory derivation from whatever was loaded for this intent.
 */

type ChatProfileRow = Pick<
  Tables<"user_profiles">,
  | "subscription_status"
  | "subscription_start_date"
  | "subscription_end_date"
  | "payment_grace_until"
  | "trial_started_at"
  | "ai_tokens_used"
  | "ai_tokens_month"
  | "welcome_ai_tokens_used"
  | "paid_trial_ai_tokens_used"
  | "bonus_ai_tokens_ledger"
  | "primary_exam"
  | "target_exam"
  | "cuet_domain_subjects"
  | "upsc_optional_subjects"
>;

/**
 * POST /api/prepbrain/chat
 * Body: { messages: { role, content }[], conversationId?: string }.
 * Only the last few messages are sent to the model; the full array is used for summarisation.
 */
export async function POST(request: Request) {
  const denied = assertSameOrigin(request);
  if (denied) return denied;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const [profileRes, room, remainMs] = await Promise.all([
    admin
      .from("user_profiles")
      .select(
        "subscription_status,subscription_start_date,subscription_end_date,payment_grace_until,trial_started_at,ai_tokens_used,ai_tokens_month,welcome_ai_tokens_used,paid_trial_ai_tokens_used,bonus_ai_tokens_ledger,primary_exam,target_exam,cuet_domain_subjects,upsc_optional_subjects",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    prepbrainAssertRoomBeforeTurn(admin, user.id, conversationIdIn),
    prepbrainCooldownRemainMs(admin, user.id),
  ]);

  const { data: profileRaw, error: profileErr } = profileRes;
  const profile = profileRaw as ChatProfileRow | null;

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
      { ok: false, error: "Mastermind requires a Kalnehi Daily account." },
      { status: 403 },
    );
  }

  if (!room.ok) {
    return NextResponse.json(
      { ok: false, error: room.error },
      { status: room.status },
    );
  }

  const paid = isPaidSubscriptionAccess(
    profile.subscription_status ?? null,
    profile.subscription_end_date ?? null,
    profile.payment_grace_until ?? null,
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
          "Mastermind is available during your 7-day free trial and with an active Smart Plan subscription.",
      },
      { status: 403 },
    );
  }

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

  const now = new Date();
  const monthKey =
    phase === "monthly"
      ? prepbrainMonthKeyFromSubscriptionStart(profile.subscription_start_date ?? null, now)
      : prepbrainCalendarMonthKey(now);
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

  const intent = detectPrepBrainIntent(last.content);

  // Analyse conversation history to detect a deepening topic thread.
  // Used to inherit the prior topic when the latest message is ambiguous
  // (e.g. "tell me more", "go deeper", "what about that specifically?").
  const { threadIntent, depth, focusSubject } = detectConversationThread(fullMessages);
  const AMBIGUOUS_INTENTS: PrepBrainIntent[] = ["general", "weak_vs_strong"];
  const effectiveIntent: Exclude<PrepBrainIntent, "small_talk"> =
    intent !== "small_talk" &&
    AMBIGUOUS_INTENTS.includes(intent) &&
    threadIntent !== null
      ? (threadIntent as Exclude<PrepBrainIntent, "small_talk">)
      : (intent as Exclude<PrepBrainIntent, "small_talk">);

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

  const selectedTools = selectToolsForIntent(effectiveIntent);
  // Deeper conversations get more chapter rows so the model can drill into specifics.
  const marksLimit = depth >= 3 ? 25 : depth === 2 ? 15 : 10;

  // Prefetched profile — passed to tool queries to eliminate redundant DB calls.
  const profileAny = profile as Record<string, unknown>;
  const prefetchedProfile: PrepbrainPrefetchedProfile = {
    primary_exam: (profileAny.primary_exam as string | null | undefined) ?? null,
    target_exam: (profileAny.target_exam as string | null | undefined) ?? null,
    cuet_domain_subjects: (profileAny.cuet_domain_subjects as string | null | undefined) ?? null,
    upsc_optional_subjects: profileAny.upsc_optional_subjects ?? null,
  };

  // Resolve model candidates once — reused for both the summary call and the main call.
  const models = resolvePrepbrainGroqModels({ request, user });

  // Run tool fetching, conversation summarisation, and token reservation in parallel.
  const [toolPack, conversationSummary, reserve] = await Promise.all([
    (async () => {
      if (selectedTools.length === 0) {
        return {
          toolData: {} as Record<string, unknown>,
          toolDataMarkdown: "",
          toolDataChars: 0,
          toolDataEstTokens: 0,
          toolCacheSources: {} as Record<string, "memory" | "redis" | "supabase">,
        };
      }
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
              prefetchedSyllabusStats = await fetchSyllabusSubjectCompletion(
                admin,
                user.id,
                prefetchedProfile,
              );
              toolCacheSet(user.id, syllabusStatsCacheKey, prefetchedSyllabusStats);
              void redisToolSet(user.id, syllabusStatsCacheKey, prefetchedSyllabusStats);
            } catch (e) {
              console.error("[prepbrain/chat] prefetch syllabus stats failed", e);
            }
          }
        }
      }

      const toolCacheSources: Record<string, "memory" | "redis" | "supabase"> = {};
      const toolResultsRaw = await Promise.all(
        selectedTools.map(async (tool) => {
          const memCached = toolCacheGet(user.id, tool);
          if (memCached !== undefined) {
            toolCacheSources[tool] = "memory";
            return [tool, memCached] as const;
          }
          const redisCached = await redisToolGet(user.id, tool);
          if (redisCached !== undefined) {
            toolCacheSources[tool] = "redis";
            toolCacheSet(user.id, tool, redisCached);
            return [tool, redisCached] as const;
          }
          toolCacheSources[tool] = "supabase";
          try {
            const result = await runToolByName(
              tool,
              admin,
              user.id,
              prefetchedProfile,
              prefetchedSyllabusStats,
              marksLimit,
            );
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
      const toolDataMarkdown = serializePrepBrainToolData(toolData, effectiveIntent);
      const toolDataChars = toolDataMarkdown.length;
      const toolDataEstTokens = Math.ceil(toolDataChars / 4);
      return { toolData, toolDataMarkdown, toolDataChars, toolDataEstTokens, toolCacheSources };
    })(),
    // Conversation summary: gives the model memory beyond the 4-message window.
    createConversationSummary(fullMessages, models),
    prepbrainAiTokenReserve(admin, user.id, monthKey),
  ]);

  if (!reserve.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          reserve.code === "insufficient_ai_tokens"
            ? prepbrainLimitReachedMessageForUi(phase)
            : "Mastermind is unavailable for your account.",
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
  const { toolDataChars, toolDataEstTokens, toolCacheSources } = toolPack;

  // Assemble the full system prompt:
  // intent prefix → depth/focus tags → core rules → summary → USER PREP DATA → last N messages.
  // USER PREP DATA sits immediately before the conversation so the model grounds
  // its answer in current data right before reading the user's question.
  const depthTag = depth > 1
    ? ` [DEPTH: ${depth}]${focusSubject ? ` [FOCUS: ${focusSubject}]` : ""}`
    : "";
  const systemContent = `[INTENT: ${effectiveIntent}]${depthTag}

${PREPBRAIN_SYSTEM_PROMPT}

${conversationSummary.text}
--- USER PREP DATA ---
${toolPack.toolDataMarkdown}
--- END USER PREP DATA ---

--- LAST ${MAX_CHAT_MESSAGES} MESSAGES ---
${fullMessages
  .slice(-MAX_CHAT_MESSAGES)
  .map((m) => `${m.role}: ${m.content}`)
  .join("\n\n")}`.trim();

  const modelMessages = messagesForModel(fullMessages);
  const aiMessages: AiChatMessage[] = [
    { role: "system", content: systemContent },
    ...modelMessages.map((m) => ({ role: m.role, content: m.content } as AiChatMessage)),
  ];

  const maxCompletionTokens = maxCompletionTokensForIntent(effectiveIntent);

  let textStream: ReadableStream<string>;
  let usagePromise: Promise<import("@/lib/aiChatClient").StreamingChatUsage>;
  try {
    const s = await callStreamingChatCompletion(models, aiMessages, {
      temperature: 0.65,
      max_tokens: maxCompletionTokens,
    });
    textStream = s.textStream;
    usagePromise = s.usagePromise;
  } catch (e) {
    await prepbrainAiTokenCancelReservation(admin, user.id, reservationId);
    console.error("[prepbrain/chat] AI error", e);
    return NextResponse.json(
      { ok: false, error: "Could not get a response. Try again." },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const sse = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = textStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "chunk", delta: value })}\n\n`,
            ),
          );
        }
        const u = await usagePromise;
        if (!u.fullText.trim()) {
          await prepbrainAiTokenCancelReservation(admin, user.id, reservationId);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                ok: false,
                error: "Could not get a response. Try again.",
              })}\n\n`,
            ),
          );
          controller.close();
          return;
        }
        const groqTotalTokens = u.totalTokens;
        const groqPromptTokens = u.promptTokens;
        const groqCompletionTokens = u.completionTokens;
        const actualRaw = Math.max(0, Math.floor(groqTotalTokens));
        const promptComp = groqPromptTokens + groqCompletionTokens;
        const billed =
          (actualRaw > 0
            ? actualRaw
            : promptComp > 0
              ? promptComp
              : PREPBRAIN_AI_TOKEN_RESERVE_ESTIMATE) + conversationSummary.tokens;

        const persistNow = new Date();
        const { tokenRow: rowAfter, patch: tokenPatch } = computePrepbrainTokenPersist(
          phase,
          tokenRow,
          monthKey,
          profile.bonus_ai_tokens_ledger,
          billed,
          persistNow,
        );
        const bonusAfter =
          (tokenPatch.bonus_ai_tokens_ledger as unknown) ?? profile.bonus_ai_tokens_ledger;
        const usageAfter = buildPrepbrainUsageDisplayPayload(
          phase,
          rowAfter,
          monthKey,
          bonusAfter,
          persistNow,
        );

        await touchPrepbrainCooldown(admin, user.id);

        const persistResult = await persistPrepbrainTurn({
          admin,
          userId: user.id,
          conversationId: conversationIdIn,
          userContent: last.content,
          assistantContent: u.fullText,
        });

        if (!persistResult.ok && persistResult.status === 400) {
          await prepbrainAiTokenCancelReservation(admin, user.id, reservationId);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                ok: false,
                error: persistResult.error,
                usage: usageAfter,
              })}\n\n`,
            ),
          );
          controller.close();
          return;
        }

        if (!persistResult.ok) {
          console.error("[prepbrain/chat] persist failed", persistResult);
          await prepbrainAiTokenCancelReservation(admin, user.id, reservationId);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                ok: false,
                error:
                  persistResult.error ??
                  "Could not save your message. Your quota was not charged.",
                usage: usageAfter,
              })}\n\n`,
            ),
          );
          controller.close();
          return;
        }

        const conversationOut = persistResult.conversationId;

        console.log(
          "[prepbrain/chat] model=%s intent=%s depth=%d max_completion_tokens=%d tools=%s cache=%s redis=%s prompt_tokens=%d completion_tokens=%d total_tokens=%d tool_chars=%d tool_est_tokens=%d summary=%s",
          u.modelUsed,
          effectiveIntent,
          depth,
          maxCompletionTokens,
          selectedTools.join(","),
          selectedTools.map((t) => toolCacheSources[t] ?? "?").join(","),
          isRedisConfigured() ? "yes" : "no",
          groqPromptTokens,
          groqCompletionTokens,
          groqTotalTokens,
          toolDataChars,
          toolDataEstTokens,
          conversationSummary.text ? "yes" : "no",
        );

        const donePayload: Record<string, unknown> = {
          type: "done",
          ok: true,
          message: u.fullText,
          conversation_id: conversationOut,
          usage: usageAfter,
          groq_model: u.modelUsed,
          intent: effectiveIntent,
          tools_used: selectedTools,
          cache_sources: toolCacheSources,
          prompt_size: {
            tool_chars: toolDataChars,
            tool_est_tokens: toolDataEstTokens,
          },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(donePayload)}\n\n`));
        controller.close();

        void after(async () => {
          const fin = await prepbrainAiTokenFinalize(admin, user.id, reservationId, billed, {
            inputTokens: groqPromptTokens,
            outputTokens: groqCompletionTokens,
            provider: u.providerUsed,
            model: u.modelUsed,
          });
          if (!fin.ok) {
            console.error("[prepbrain/chat] token finalize failed (after response)");
          }
        });
      } catch (err) {
        await prepbrainAiTokenCancelReservation(admin, user.id, reservationId);
        console.error("[prepbrain/chat] stream error", err);
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                ok: false,
                error: "Could not get a response. Try again.",
              })}\n\n`,
            ),
          );
        } catch {
          /* stream may be closed */
        }
        try {
          controller.close();
        } catch {
          /* */
        }
      }
    },
  });

  return new Response(sse, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
