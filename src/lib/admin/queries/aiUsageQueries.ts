import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import { dateKeyIST } from "@/lib/admin/istDates";
import { loadAdminPricingInr, computeAiCostInr } from "@/lib/admin/pricing";

export type AiProviderBreakdown = {
  inputTokens: number;
  outputTokens: number;
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
};

export async function getAiUsageSnapshot(): Promise<AiUsageSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const pricing = await loadAdminPricingInr();

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

  // PrepBrain / HelpyJi rows
  for (const r of rows) {
    const t = new Date(r.finalized_at).getTime();
    const k = dateKeyIST(new Date(r.finalized_at));

    // Compute cost: use input/output split if available, otherwise treat all as input
    const inputTok = r.input_tokens ?? r.estimate;
    const outputTok = r.output_tokens ?? 0;
    const provider = r.provider ?? "deepinfra";
    const rowCost = computeAiCostInr(inputTok, outputTok, provider, pricing);

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
  }

  // Voice rows (Groq only)
  for (const v of voiceRows) {
    const t = new Date(v.created_at).getTime();
    const k = dateKeyIST(new Date(v.created_at));
    const voiceTokens = v.input_tokens + v.output_tokens;
    const rowCost = computeAiCostInr(v.input_tokens, v.output_tokens, "groq", pricing);

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

  const paidIds = new Set(paidUsers.map((p) => p.user_id).filter(Boolean) as string[]);
  const trialIds = new Set(trialUsers.map((p) => p.user_id).filter(Boolean) as string[]);

  const paidTok = sumTokensByUser(paidIds);
  const trialTok = sumTokensByUser(trialIds);

  const avgTokensPerPayingUser = paidIds.size > 0 ? paidTok / paidIds.size : 0;
  const avgTokensPerTrialUser = trialIds.size > 0 ? trialTok / trialIds.size : 0;

  const mrrContribution =
    paidUsers.filter((p) => p.subscription_plan === "monthly").length * pricing.smartMonthlyInr +
    paidUsers.filter((p) => p.subscription_plan === "annual").length * (pricing.smartAnnualInr / 12);

  const trialHits = trialUsers.filter((p) => (p.welcome_ai_tokens_used ?? 0) >= 55_000).length;
  const trialTokenHitRatePct = trialUsers.length > 0 ? (trialHits / trialUsers.length) * 100 : 0;

  return {
    tokensFinalizedByDay: [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
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
  };
}
