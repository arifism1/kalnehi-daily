import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import {
  MISTRAL_DEEPINFRA_PRICE_REVALIDATE_SEC,
  resolveMastermindMistralInrRates,
} from "@/lib/admin/deepInfraPublicPricing";
import { dateKeyIST } from "@/lib/admin/istDates";
import {
  loadAdminPricingInr,
  computeAiCostInr,
  computePrepbrainReservationCostInr,
} from "@/lib/admin/pricing";
import { MASTERMIND_DEEPINFRA_MODEL } from "@/lib/groqPrepbrainModel";
import { getAllAdminConfig } from "@/lib/waitlist/batchEngine";

export type AiProviderBreakdown = {
  inputTokens: number;
  outputTokens: number;
  costInr: number;
};

/** PrepBrain finalized rows only, provider `deepinfra` split by Mastermind Mistral vs other models. */
export type AiPrepbrainDeepinfraWindow = {
  inputTokens: number;
  outputTokens: number;
  billedTokens: number;
  finalizedCount: number;
  costInr: number;
};

export type AiPrepbrainDeepinfraSplit = {
  mastermindMistral: {
    today: AiPrepbrainDeepinfraWindow;
    week: AiPrepbrainDeepinfraWindow;
    month: AiPrepbrainDeepinfraWindow;
  };
  otherDeepinfra: {
    today: AiPrepbrainDeepinfraWindow;
    week: AiPrepbrainDeepinfraWindow;
    month: AiPrepbrainDeepinfraWindow;
  };
};

export type AiUsageTopUserRow = {
  userId: string;
  prepbrainTokens: number;
  voiceTokens: number;
  totalTokens: number;
  costInr: number;
};

export type AiUsageSnapshot = {
  tokensFinalizedByDay: { day: string; tokens: number; costInr: number }[];
  tokensToday: number;
  tokensThisWeek: number;
  tokensThisMonth: number;
  costTodayInr: number;
  costThisWeekInr: number;
  costThisMonthInr: number;
  avgTokensPerPayingUser: number;
  avgTokensPerTrialUser: number;
  costPercentOfMrr: number | null;
  trialTokenHitRatePct: number;
  mrrInr: number;
  providerBreakdownToday: { deepinfra: AiProviderBreakdown; groq: AiProviderBreakdown };
  prepbrainDeepinfraSplit: AiPrepbrainDeepinfraSplit;
  /** Mastermind Mistral ₹/M used for cost rows; prefers live DeepInfra public list price (see cache). */
  mastermindMistralPricing: {
    source: "deepinfra_live" | "admin_config";
    inputInrPerM: number;
    outputInrPerM: number;
    liveFetchError?: string;
    cacheRevalidateSeconds: number;
  };
  /** Top users by PrepBrain billed + voice tokens in the same snapshot window (~40d). */
  topUsersByAiTokens: AiUsageTopUserRow[];
};

export async function getAiUsageSnapshot(): Promise<AiUsageSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const [pricingBase, cfg] = await Promise.all([loadAdminPricingInr(), getAllAdminConfig()]);
  const usdToInr = parseFloat(cfg.ai_usd_to_inr_rate ?? "95");
  const usdToInrRate = Number.isFinite(usdToInr) && usdToInr > 0 ? usdToInr : 95;

  const mistralResolved = await resolveMastermindMistralInrRates(usdToInrRate, {
    inputInrPerM: pricingBase.deepinfraMistralInputInrPerM,
    outputInrPerM: pricingBase.deepinfraMistralOutputInrPerM,
  });

  const pricing = {
    ...pricingBase,
    deepinfraMistralInputInrPerM: mistralResolved.inputInrPerM,
    deepinfraMistralOutputInrPerM: mistralResolved.outputInrPerM,
  };

  const mastermindMistralPricing = {
    source: mistralResolved.source,
    inputInrPerM: mistralResolved.inputInrPerM,
    outputInrPerM: mistralResolved.outputInrPerM,
    liveFetchError: mistralResolved.liveFetchError,
    cacheRevalidateSeconds: MISTRAL_DEEPINFRA_PRICE_REVALIDATE_SEC,
  };

  const since = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString();

  const [resRowsResult, profilesResult, voiceRowsResult] = await Promise.all([
    admin
      .from("prepbrain_ai_token_reservations")
      .select("estimate, finalized_at, user_id, input_tokens, output_tokens, provider, model")
      .not("finalized_at", "is", null)
      .gte("finalized_at", since),
    admin
      .from("user_profiles")
      .select(
        "user_id, subscription_status, subscription_plan, subscription_end_date, trial_started_at, has_used_free_trial, has_had_trial, welcome_ai_tokens_used",
      ),
    admin
      .from("voice_ai_usage_log")
      .select("input_tokens, output_tokens, provider, model, user_id, created_at")
      .gte("created_at", since),
  ]);

  const profs = ((profilesResult.data ?? []) as {
    user_id: string | null;
    subscription_status: string | null;
    subscription_plan: string | null;
    subscription_end_date: string | null;
    trial_started_at: string | null;
    has_used_free_trial: boolean | null;
    has_had_trial: boolean | null;
    welcome_ai_tokens_used: number | null;
  }[]);

  const isPaid = (p: (typeof profs)[0]) =>
    (p.subscription_status === "active" || p.subscription_status === "cancelled") &&
    p.subscription_end_date &&
    new Date(p.subscription_end_date) > new Date();

  const paidUsers = profs.filter(isPaid);
  const trialUsers = profs.filter(
    (p) =>
      (p.has_used_free_trial || p.has_had_trial) &&
      p.trial_started_at &&
      !isPaid(p),
  );

  type PrepRow = {
    estimate: number;
    finalized_at: string;
    user_id: string;
    input_tokens: number | null;
    output_tokens: number | null;
    provider: string | null;
    model: string | null;
  };
  const rows = (resRowsResult.data ?? []) as PrepRow[];

  type VoiceRow = {
    input_tokens: number;
    output_tokens: number;
    provider: string;
    model: string;
    user_id: string;
    created_at: string;
  };
  const voiceRows = (voiceRowsResult.data ?? []) as VoiceRow[];

  const byDay = new Map<string, { tokens: number; costInr: number }>();
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;
  const tKey = dateKeyIST(new Date());

  let tokensToday = 0;
  let tokensThisWeek = 0;
  let tokensThisMonth = 0;
  let costTodayInr = 0;
  let costThisWeekInr = 0;
  let costThisMonthInr = 0;

  const providerToday = {
    deepinfra: { inputTokens: 0, outputTokens: 0, costInr: 0 },
    groq: { inputTokens: 0, outputTokens: 0, costInr: 0 },
  };

  const emptyDeepinfraWindow = (): AiPrepbrainDeepinfraWindow => ({
    inputTokens: 0,
    outputTokens: 0,
    billedTokens: 0,
    finalizedCount: 0,
    costInr: 0,
  });

  const prepbrainDeepinfraSplit: AiPrepbrainDeepinfraSplit = {
    mastermindMistral: {
      today: emptyDeepinfraWindow(),
      week: emptyDeepinfraWindow(),
      month: emptyDeepinfraWindow(),
    },
    otherDeepinfra: {
      today: emptyDeepinfraWindow(),
      week: emptyDeepinfraWindow(),
      month: emptyDeepinfraWindow(),
    },
  };

  type UserAgg = { prepbrainTokens: number; voiceTokens: number; costInr: number };
  const userAgg = new Map<string, UserAgg>();
  const bumpUser = (uid: string) => {
    let a = userAgg.get(uid);
    if (!a) {
      a = { prepbrainTokens: 0, voiceTokens: 0, costInr: 0 };
      userAgg.set(uid, a);
    }
    return a;
  };

  const addDeepinfraSplit = (
    target: AiPrepbrainDeepinfraWindow,
    r: PrepRow,
    inputTok: number,
    outputTok: number,
    rowCost: number,
  ) => {
    target.inputTokens += inputTok;
    target.outputTokens += outputTok;
    target.billedTokens += r.estimate;
    target.finalizedCount += 1;
    target.costInr += rowCost;
  };

  // PrepBrain rows
  for (const r of rows) {
    const t = new Date(r.finalized_at).getTime();
    const k = dateKeyIST(new Date(r.finalized_at));

    // Compute cost: use input/output split if available, otherwise treat all as input
    const inputTok = r.input_tokens ?? r.estimate;
    const outputTok = r.output_tokens ?? 0;
    const provider = r.provider ?? "deepinfra";
    const rowCost = computePrepbrainReservationCostInr(inputTok, outputTok, provider, r.model, pricing);

    const uAgg = bumpUser(r.user_id);
    uAgg.prepbrainTokens += r.estimate;
    uAgg.costInr += rowCost;

    const existing = byDay.get(k) ?? { tokens: 0, costInr: 0 };
    byDay.set(k, { tokens: existing.tokens + r.estimate, costInr: existing.costInr + rowCost });

    if (k === tKey) {
      tokensToday += r.estimate;
      costTodayInr += rowCost;
      const provKey = provider === "deepinfra" ? "deepinfra" : "groq";
      providerToday[provKey].inputTokens += inputTok;
      providerToday[provKey].outputTokens += outputTok;
      providerToday[provKey].costInr += rowCost;
    }
    if (now - t <= 7 * dayMs) { tokensThisWeek += r.estimate; costThisWeekInr += rowCost; }
    if (now - t <= 30 * dayMs) { tokensThisMonth += r.estimate; costThisMonthInr += rowCost; }

    if (provider === "deepinfra") {
      const isMistral = r.model === MASTERMIND_DEEPINFRA_MODEL;
      const mistralBuckets = prepbrainDeepinfraSplit.mastermindMistral;
      const otherBuckets = prepbrainDeepinfraSplit.otherDeepinfra;
      if (isMistral) {
        if (k === tKey) addDeepinfraSplit(mistralBuckets.today, r, inputTok, outputTok, rowCost);
        if (now - t <= 7 * dayMs) addDeepinfraSplit(mistralBuckets.week, r, inputTok, outputTok, rowCost);
        if (now - t <= 30 * dayMs) addDeepinfraSplit(mistralBuckets.month, r, inputTok, outputTok, rowCost);
      } else {
        if (k === tKey) addDeepinfraSplit(otherBuckets.today, r, inputTok, outputTok, rowCost);
        if (now - t <= 7 * dayMs) addDeepinfraSplit(otherBuckets.week, r, inputTok, outputTok, rowCost);
        if (now - t <= 30 * dayMs) addDeepinfraSplit(otherBuckets.month, r, inputTok, outputTok, rowCost);
      }
    }
  }

  // Voice rows (Groq only)
  for (const v of voiceRows) {
    const t = new Date(v.created_at).getTime();
    const k = dateKeyIST(new Date(v.created_at));
    const voiceTokens = v.input_tokens + v.output_tokens;
    const rowCost = computeAiCostInr(v.input_tokens, v.output_tokens, "groq", pricing);

    const uAgg = bumpUser(v.user_id);
    uAgg.voiceTokens += voiceTokens;
    uAgg.costInr += rowCost;

    const existing = byDay.get(k) ?? { tokens: 0, costInr: 0 };
    byDay.set(k, { tokens: existing.tokens + voiceTokens, costInr: existing.costInr + rowCost });

    if (k === tKey) {
      tokensToday += voiceTokens;
      costTodayInr += rowCost;
      providerToday.groq.inputTokens += v.input_tokens;
      providerToday.groq.outputTokens += v.output_tokens;
      providerToday.groq.costInr += rowCost;
    }
    if (now - t <= 7 * dayMs) { tokensThisWeek += voiceTokens; costThisWeekInr += rowCost; }
    if (now - t <= 30 * dayMs) { tokensThisMonth += voiceTokens; costThisMonthInr += rowCost; }
  }

  const sumTokensByUser = (uids: Set<string>) => {
    let s = 0;
    for (const r of rows) {
      if (uids.has(r.user_id)) s += r.estimate;
    }
    return s;
  };

  const paidIds = new Set(paidUsers.flatMap((p) => (p.user_id ? [p.user_id] : [])));
  const trialIds = new Set(trialUsers.flatMap((p) => (p.user_id ? [p.user_id] : [])));

  const paidTok = sumTokensByUser(paidIds);
  const trialTok = sumTokensByUser(trialIds);

  const avgTokensPerPayingUser = paidIds.size > 0 ? paidTok / paidIds.size : 0;
  const avgTokensPerTrialUser = trialIds.size > 0 ? trialTok / trialIds.size : 0;

  const mrrContribution =
    paidUsers.filter((p) => p.subscription_plan === "monthly").length * pricing.smartMonthlyInr +
    paidUsers.filter((p) => p.subscription_plan === "annual").length * (pricing.smartAnnualInr / 12);

  const trialHits = trialUsers.filter((p) => (p.welcome_ai_tokens_used ?? 0) >= 55_000).length;
  const trialTokenHitRatePct = trialUsers.length > 0 ? (trialHits / trialUsers.length) * 100 : 0;

  // react-doctor-disable-next-line react-doctor/js-combine-iterations -- map-then-filter for admin analytics; performance not a concern
  const topUsersByAiTokens: AiUsageTopUserRow[] = [...userAgg.entries()]
    .map(([userId, a]) => ({
      userId,
      prepbrainTokens: a.prepbrainTokens,
      voiceTokens: a.voiceTokens,
      totalTokens: a.prepbrainTokens + a.voiceTokens,
      costInr: a.costInr,
    }))
    .filter((r) => r.totalTokens > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 30);

  return {
    tokensFinalizedByDay: [...byDay.entries()]
      .toSorted((a, b) => a[0].localeCompare(b[0]))
      .map(([day, { tokens, costInr }]) => ({ day, tokens, costInr })),
    tokensToday,
    tokensThisWeek,
    tokensThisMonth,
    costTodayInr,
    costThisWeekInr,
    costThisMonthInr,
    avgTokensPerPayingUser,
    avgTokensPerTrialUser,
    costPercentOfMrr: mrrContribution > 0 ? (costThisMonthInr / mrrContribution) * 100 : null,
    trialTokenHitRatePct,
    mrrInr: mrrContribution,
    providerBreakdownToday: providerToday,
    prepbrainDeepinfraSplit,
    mastermindMistralPricing,
    topUsersByAiTokens,
  };
}
