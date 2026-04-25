import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import { listAllAuthUsers } from "@/lib/admin/authUsers";
import { dateKeyIST, todayISTKey, yesterdayISTKey, sameDayLastWeekISTKey } from "@/lib/admin/istDates";
import { loadAdminPricingInr, paymentKindToInr, computeAiCostInr } from "@/lib/admin/pricing";

export type OverviewAlert = { level: "warn" | "critical"; message: string };

export type TrialCohortRow = { daysRemaining: number; userCount: number };

export type OverviewSnapshot = {
  activeUsers24h: number;
  activeFreeTrialUsers: number;
  trialCohortsByDayRemaining: TrialCohortRow[];
  smartPlanMonthly: number;
  smartPlanAnnual: number;
  signupsToday: number;
  signupsYesterday: number;
  signupsSameDayLastWeek: number;
  conversionsToday: number;
  revenueTodayInr: number;
  aiTokensFinalizedToday: number;
  aiCostTodayInr: number;
  batchSystemActive: boolean;
  activeBatch: {
    batchNumber: number;
    status: string;
    size: number;
    spotsFilled: number;
    spotsRemaining: number;
  } | null;
  waitlistDepth: number;
  waitlistWaiting: number;
  trialQueuePending: number;
  alerts: OverviewAlert[];
};

const TRIAL_DAYS = 3;

function isPayingActive(p: {
  subscription_status: string | null;
  subscription_end_date: string | null;
}): boolean {
  if (p.subscription_status !== "active" && p.subscription_status !== "cancelled") return false;
  if (!p.subscription_end_date) return false;
  return new Date(p.subscription_end_date) > new Date();
}

function trialEndIso(trialStartedAt: string): string {
  return new Date(
    new Date(trialStartedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export async function getOverviewSnapshot(): Promise<OverviewSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const [pricing, authUsers, profilesRes, batchesRes, waitRes, waitWaitingRes, trialQueueRes, paymentsRes, tokenRes] =
    await Promise.all([
      loadAdminPricingInr(),
      listAllAuthUsers(admin),
      admin
        .from("user_profiles")
        .select(
          "user_id, subscription_status, subscription_plan, subscription_end_date, trial_started_at, has_used_free_trial, has_had_trial, payment_grace_until, welcome_ai_tokens_used, ai_tokens_used",
        ),
      admin.from("batches").select("id, batch_number, status, size, opens_at").order("batch_number", { ascending: true }),
      admin.from("waitlist_entries").select("id", { count: "exact", head: true }),
      admin
        .from("waitlist_entries")
        .select("id", { count: "exact", head: true })
        .eq("status", "waiting"),
      admin
        .from("trial_queue_entries" as never)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      admin
        .from("razorpay_processed_payments")
        .select("kind, created_at, user_id")
        .gte("created_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString()),
      admin
        .from("prepbrain_ai_token_reservations")
        .select("estimate, finalized_at, input_tokens, output_tokens, provider")
        .not("finalized_at", "is", null)
        .gte("finalized_at", new Date(Date.now() - 36 * 3600 * 1000).toISOString()),
    ]);

  const profiles = (profilesRes.data ?? []) as {
    user_id: string | null;
    subscription_status: string | null;
    subscription_plan: string | null;
    subscription_end_date: string | null;
    trial_started_at: string | null;
    has_used_free_trial: boolean | null;
    has_had_trial: boolean | null;
    payment_grace_until: string | null;
    welcome_ai_tokens_used: number | null;
    ai_tokens_used: number | null;
  }[];

  const tKey = todayISTKey();
  const yKey = yesterdayISTKey();
  const wKey = sameDayLastWeekISTKey();

  const signupsToday = authUsers.filter((u) => {
    const k = dateKeyIST(new Date(u.created_at));
    return k === tKey;
  }).length;

  const signupsYesterday = authUsers.filter((u) => dateKeyIST(new Date(u.created_at)) === yKey).length;

  const signupsSameDayLastWeek = authUsers.filter((u) => dateKeyIST(new Date(u.created_at)) === wKey).length;

  const ms24h = Date.now() - 24 * 3600 * 1000;
  const activeUsers24h = authUsers.filter((u) => {
    const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
    return last >= ms24h;
  }).length;

  const now = Date.now();
  let activeFreeTrialUsers = 0;
  const cohortMap = new Map<number, number>();

  for (const p of profiles) {
    if (!p.trial_started_at || !p.user_id) continue;
    if (isPayingActive(p)) continue;
    const trialEnd = new Date(trialEndIso(p.trial_started_at)).getTime();
    if (trialEnd <= now) continue;
    if (!(p.has_used_free_trial || p.has_had_trial)) continue;
    activeFreeTrialUsers++;
    const msLeft = trialEnd - now;
    const daysRemaining = Math.max(0, Math.ceil(msLeft / (24 * 3600 * 1000)));
    cohortMap.set(daysRemaining, (cohortMap.get(daysRemaining) ?? 0) + 1);
  }

  const trialCohortsByDayRemaining: TrialCohortRow[] = [...cohortMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([daysRemaining, userCount]) => ({ daysRemaining, userCount }));

  const smartPlanMonthly = profiles.filter(
    (p) =>
      p.subscription_plan === "monthly" &&
      (p.subscription_status === "active" || p.subscription_status === "cancelled") &&
      p.subscription_end_date &&
      new Date(p.subscription_end_date) > new Date(),
  ).length;

  const smartPlanAnnual = profiles.filter(
    (p) =>
      p.subscription_plan === "annual" &&
      (p.subscription_status === "active" || p.subscription_status === "cancelled") &&
      p.subscription_end_date &&
      new Date(p.subscription_end_date) > new Date(),
  ).length;

  const payments = (paymentsRes.data ?? []) as { kind: string; created_at: string; user_id: string }[];

  const conversionsToday = payments.filter((pay) => {
    if (pay.kind !== "plan_upgrade" && pay.kind !== "annual_plan") return false;
    return dateKeyIST(new Date(pay.created_at)) === tKey;
  }).length;

  let revenueTodayInr = 0;
  for (const pay of payments) {
    if (dateKeyIST(new Date(pay.created_at)) !== tKey) continue;
    revenueTodayInr += paymentKindToInr(pay.kind, pricing);
  }

  let aiTokensFinalizedToday = 0;
  let aiCostTodayInr = 0;
  const tokRows = (tokenRes.data ?? []) as {
    estimate: number;
    finalized_at: string;
    input_tokens: number | null;
    output_tokens: number | null;
    provider: string | null;
  }[];
  for (const row of tokRows) {
    if (dateKeyIST(new Date(row.finalized_at)) !== tKey) continue;
    aiTokensFinalizedToday += row.estimate;
    const inputTok = row.input_tokens ?? row.estimate;
    const outputTok = row.output_tokens ?? 0;
    const provider = row.provider ?? "deepinfra";
    aiCostTodayInr += computeAiCostInr(inputTok, outputTok, provider, pricing);
  }

  const batches = (batchesRes.data ?? []) as {
    id: string;
    batch_number: number;
    status: string;
    size: number;
    opens_at: string;
  }[];

  const batchSystemActive = batches.some((b) => b.status === "scheduled" || b.status === "active");
  const activeBatchRow = batches.find((b) => b.status === "active");

  let activeBatch: OverviewSnapshot["activeBatch"] = null;
  if (activeBatchRow) {
    const { count } = await admin
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", activeBatchRow.id);
    const filled = count ?? 0;
    activeBatch = {
      batchNumber: activeBatchRow.batch_number,
      status: activeBatchRow.status,
      size: activeBatchRow.size,
      spotsFilled: filled,
      spotsRemaining: Math.max(0, activeBatchRow.size - filled),
    };
  }

  const waitlistDepth = waitRes.count ?? 0;
  const waitlistWaiting = waitWaitingRes.count ?? 0;
  const trialQueuePending = (trialQueueRes as { count?: number | null }).count ?? 0;

  const alerts: OverviewAlert[] = [];
  const graceUsers = profiles.filter(
    (p) => p.payment_grace_until && new Date(p.payment_grace_until) > new Date(),
  ).length;
  if (graceUsers >= 10) {
    alerts.push({
      level: "warn",
      message: `${graceUsers} users in payment grace — check Razorpay health.`,
    });
  }
  if (revenueTodayInr > 0 && aiCostTodayInr / revenueTodayInr > 0.2) {
    alerts.push({
      level: "critical",
      message: `AI cost is ${((aiCostTodayInr / revenueTodayInr) * 100).toFixed(0)}% of today's revenue (target < 15%).`,
    });
  }

  const trialHitCap = profiles.filter(
    (p) => (p.welcome_ai_tokens_used ?? 0) >= 55_000 && !isPayingActive(p),
  ).length;
  if (activeFreeTrialUsers > 5 && trialHitCap / activeFreeTrialUsers > 0.65) {
    alerts.push({
      level: "warn",
      message: `High trial token limit hit rate (~${((trialHitCap / activeFreeTrialUsers) * 100).toFixed(0)}%) — users may churn before Day 3.`,
    });
  }

  return {
    activeUsers24h,
    activeFreeTrialUsers,
    trialCohortsByDayRemaining,
    smartPlanMonthly,
    smartPlanAnnual,
    signupsToday,
    signupsYesterday,
    signupsSameDayLastWeek,
    conversionsToday,
    revenueTodayInr,
    aiTokensFinalizedToday,
    aiCostTodayInr,
    batchSystemActive,
    activeBatch,
    waitlistDepth,
    waitlistWaiting,
    trialQueuePending,
    alerts,
  };
}
