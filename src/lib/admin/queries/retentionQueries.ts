import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import { adminSegmentLabelFromProfile } from "@/lib/profileTrackSegment";

export type CohortRow = {
  cohortMonth: string;
  trialStarted: number;
  payingNow: number;
  retentionPct: number;
};

export type RetentionSnapshot = {
  cohorts: CohortRow[];
  churnApproxMonthlyPct: number;
  churnByExam: { exam: string; cancelledLast30d: number; paying: number; churnPct: number }[];
  churnByPlan: { plan: string; cancelledLast30d: number; paying: number }[];
  avgSubscriptionDaysBeforeCancel: number | null;
};

function monthKeyIST(iso: string): string {
  const d = new Date(iso);
  const y = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata", year: "numeric" });
  const m = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata", month: "2-digit" });
  return `${y}-${m}`;
}

function isPaying(p: {
  subscription_status: string | null;
  subscription_end_date: string | null;
}): boolean {
  if (p.subscription_status !== "active" && p.subscription_status !== "cancelled") return false;
  if (!p.subscription_end_date) return false;
  return new Date(p.subscription_end_date) > new Date();
}

export async function getRetentionSnapshot(): Promise<RetentionSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const { data } = await admin
    .from("user_profiles")
    .select(
      "trial_started_at, subscription_status, subscription_end_date, subscription_cancelled_at, subscription_start_date, subscription_plan, target_exam, primary_exam, selected_track",
    );

  const profiles = (data ?? []) as {
    trial_started_at: string | null;
    subscription_status: string | null;
    subscription_end_date: string | null;
    subscription_cancelled_at: string | null;
    subscription_start_date: string | null;
    subscription_plan: string | null;
    target_exam: string | null;
    primary_exam: string | null;
    selected_track: string | null;
  }[];

  const cohortMap = new Map<string, { total: number; paying: number }>();
  const now = Date.now();
  const thirtyAgo = now - 30 * 24 * 3600 * 1000;

  for (const p of profiles) {
    if (!p.trial_started_at) continue;
    const ck = monthKeyIST(p.trial_started_at);
    const slot = cohortMap.get(ck) ?? { total: 0, paying: 0 };
    slot.total++;
    if (isPaying(p)) slot.paying++;
    cohortMap.set(ck, slot);
  }

  const sortedMonths = [...cohortMap.keys()].toSorted().slice(-8);
  const cohortRows: CohortRow[] = sortedMonths.map((cohortMonth) => {
    const { total, paying } = cohortMap.get(cohortMonth)!;
    return {
      cohortMonth,
      trialStarted: total,
      payingNow: paying,
      retentionPct: total > 0 ? (paying / total) * 100 : 0,
    };
  });

  let cancelledRecent = 0;
  let payingCount = 0;
  const cancelDur: number[] = [];

  for (const p of profiles) {
    if (isPaying(p)) payingCount++;
    if (p.subscription_cancelled_at && new Date(p.subscription_cancelled_at).getTime() >= thirtyAgo) {
      cancelledRecent++;
      if (p.subscription_start_date) {
        const start = new Date(p.subscription_start_date).getTime();
        const end = new Date(p.subscription_cancelled_at).getTime();
        if (end > start) cancelDur.push((end - start) / (24 * 3600 * 1000));
      }
    }
  }

  const churnApproxMonthlyPct =
    payingCount + cancelledRecent > 0 ? (cancelledRecent / (payingCount + cancelledRecent)) * 100 : 0;

  const examKeys = new Set<string>();
  for (const p of profiles) {
    examKeys.add(adminSegmentLabelFromProfile(p));
  }

  // react-doctor-disable-next-line react-doctor/js-combine-iterations -- map-then-filter for admin analytics; performance not a concern
  const churnByExam = [...examKeys].map((exam) => {
    const subset = profiles.filter((p) => adminSegmentLabelFromProfile(p) === exam);
    const paying = subset.filter(isPaying).length;
    const cancelled = subset.filter(
      (p) =>
        p.subscription_cancelled_at && new Date(p.subscription_cancelled_at).getTime() >= thirtyAgo,
    ).length;
    const churnPct = paying + cancelled > 0 ? (cancelled / (paying + cancelled)) * 100 : 0;
    return { exam, cancelledLast30d: cancelled, paying, churnPct };
  }).filter((r) => r.paying + r.cancelledLast30d > 0).sort((a, b) => b.churnPct - a.churnPct).slice(0, 15);

  const planKeys = ["monthly", "annual"] as const;
  const churnByPlan = planKeys.map((plan) => {
    const subset = profiles.filter((p) => p.subscription_plan === plan);
    const paying = subset.filter(isPaying).length;
    const cancelled = subset.filter(
      (p) =>
        p.subscription_cancelled_at && new Date(p.subscription_cancelled_at).getTime() >= thirtyAgo,
    ).length;
    return { plan, cancelledLast30d: cancelled, paying };
  });

  const avgSubscriptionDaysBeforeCancel =
    cancelDur.length > 0 ? cancelDur.reduce((a, b) => a + b, 0) / cancelDur.length : null;

  return {
    cohorts: cohortRows,
    churnApproxMonthlyPct,
    churnByExam,
    churnByPlan,
    avgSubscriptionDaysBeforeCancel,
  };
}
