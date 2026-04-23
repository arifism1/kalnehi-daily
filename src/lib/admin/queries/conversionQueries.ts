import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import { fetchFeatureEventsSince } from "@/lib/admin/queries/featureEventQueries";

export type ConversionSnapshot = {
  trialLikeCount: number;
  payingCount: number;
  overallConversionPct: number;
  paidTrialToMonthlyPct: number;
  skipCount: number;
  planUpgrades30d: number;
  annualPlans30d: number;
  paywallViews: number;
  conversionsWithPrepbrainTouch: number;
  byExam: { exam: string; trials: number; paid: number; pct: number }[];
};

function examOf(p: { target_exam: string | null; primary_exam: string | null }): string {
  return (p.target_exam || p.primary_exam || "Unknown").trim() || "Unknown";
}

function isPaying(p: {
  subscription_status: string | null;
  subscription_end_date: string | null;
}): boolean {
  if (p.subscription_status !== "active" && p.subscription_status !== "cancelled") return false;
  if (!p.subscription_end_date) return false;
  return new Date(p.subscription_end_date) > new Date();
}

export async function getConversionSnapshot(): Promise<ConversionSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [{ data: profiles }, { data: payments }, events] = await Promise.all([
    admin
      .from("user_profiles")
      .select(
        "user_id, subscription_status, subscription_end_date, target_exam, primary_exam, has_used_free_trial, has_had_trial, trial_started_at",
      ),
    admin.from("razorpay_processed_payments").select("kind, user_id, created_at").gte("created_at", since),
    fetchFeatureEventsSince(since),
  ]);

  const profs = (profiles ?? []) as {
    user_id: string | null;
    subscription_status: string | null;
    subscription_end_date: string | null;
    target_exam: string | null;
    primary_exam: string | null;
    has_used_free_trial: boolean | null;
    has_had_trial: boolean | null;
    trial_started_at: string | null;
  }[];

  const trialLike = profs.filter(
    (p) => (p.has_used_free_trial || p.has_had_trial || p.trial_started_at) && p.user_id,
  );
  const paying = profs.filter((p) => isPaying(p) && p.user_id);
  const payingIds = new Set(paying.map((p) => p.user_id!));

  const trialIds = new Set(trialLike.map((p) => p.user_id!));
  const overallConversionPct =
    trialIds.size > 0
      ? ([...trialIds].filter((id) => payingIds.has(id)).length / trialIds.size) * 100
      : 0;

  const payersWithSkip = new Set(
    (payments ?? [])
      .filter((x) => (x as { kind: string }).kind === "waitlist_skip")
      .map((x) => (x as { user_id: string }).user_id),
  );

  const paidTrialThenMonthly = [...payingIds].filter((id) => payersWithSkip.has(id)).length;

  const paywallViews = events.filter((e) => e.event === "paywall_view" || e.event === "paywall_shown").length;

  const prepbrainUsers = new Set(events.filter((e) => e.feature === "prepbrain").map((e) => e.user_id));
  const conversionsWithPrepbrainTouch = [...payingIds].filter((id) => prepbrainUsers.has(id)).length;

  const byExamMap = new Map<string, { trials: number; paid: number }>();
  for (const p of profs) {
    const ex = examOf(p);
    const slot = byExamMap.get(ex) ?? { trials: 0, paid: 0 };
    if (p.has_used_free_trial || p.has_had_trial || p.trial_started_at) slot.trials++;
    if (isPaying(p)) slot.paid++;
    byExamMap.set(ex, slot);
  }

  const byExam = [...byExamMap.entries()]
    .map(([exam, s]) => ({
      exam,
      trials: s.trials,
      paid: s.paid,
      pct: s.trials > 0 ? (s.paid / s.trials) * 100 : 0,
    }))
    .filter((r) => r.trials > 0)
    .sort((a, b) => b.trials - a.trials)
    .slice(0, 20);

  const pays = (payments ?? []) as { kind: string }[];
  const planUpgrades30d = pays.filter((p) => p.kind === "plan_upgrade").length;
  const annualPlans30d = pays.filter((p) => p.kind === "annual_plan").length;

  return {
    trialLikeCount: trialIds.size,
    payingCount: payingIds.size,
    overallConversionPct,
    paidTrialToMonthlyPct: payingIds.size > 0 ? (paidTrialThenMonthly / payingIds.size) * 100 : 0,
    skipCount: payersWithSkip.size,
    planUpgrades30d,
    annualPlans30d,
    paywallViews,
    conversionsWithPrepbrainTouch,
    byExam,
  };
}
