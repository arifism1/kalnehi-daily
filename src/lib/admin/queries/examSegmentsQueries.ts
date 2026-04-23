import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import { loadAdminPricingInr } from "@/lib/admin/pricing";

export type ExamSegmentRow = {
  exam: string;
  users: number;
  paying: number;
  trialOrFree: number;
  conversionPct: number;
  churnedRecently: number;
  arpuInr: number;
};

export type ExamSegmentsSnapshot = {
  rows: ExamSegmentRow[];
};

function examOf(p: {
  target_exam: string | null;
  primary_exam: string | null;
}): string {
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

export async function getExamSegmentsSnapshot(): Promise<ExamSegmentsSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const pricing = await loadAdminPricingInr();

  const { data } = await admin
    .from("user_profiles")
    .select(
      "subscription_status, subscription_end_date, subscription_plan, target_exam, primary_exam, has_used_free_trial, has_had_trial, trial_started_at, subscription_cancelled_at",
    );

  const profiles = (data ?? []) as {
    subscription_status: string | null;
    subscription_end_date: string | null;
    subscription_plan: string | null;
    target_exam: string | null;
    primary_exam: string | null;
    has_used_free_trial: boolean | null;
    has_had_trial: boolean | null;
    trial_started_at: string | null;
    subscription_cancelled_at: string | null;
  }[];

  const thirtyAgo = Date.now() - 30 * 24 * 3600 * 1000;

  const byExam = new Map<
    string,
    { users: number; paying: number; trial: number; churned: number }
  >();

  for (const p of profiles) {
    const ex = examOf(p);
    const slot = byExam.get(ex) ?? { users: 0, paying: 0, trial: 0, churned: 0 };
    slot.users++;
    if (isPaying(p)) {
      slot.paying++;
    } else if (p.has_used_free_trial || p.has_had_trial || p.trial_started_at) {
      slot.trial++;
    }
    if (p.subscription_cancelled_at && new Date(p.subscription_cancelled_at).getTime() >= thirtyAgo) {
      slot.churned++;
    }
    byExam.set(ex, slot);
  }

  const rows: ExamSegmentRow[] = [...byExam.entries()].map(([exam, s]) => {
    const conversionPct = s.users > 0 ? (s.paying / s.users) * 100 : 0;
    let mrr = 0;
    for (const p of profiles) {
      if (examOf(p) !== exam || !isPaying(p)) continue;
      if (p.subscription_plan === "monthly") mrr += pricing.smartMonthlyInr;
      else if (p.subscription_plan === "annual") mrr += pricing.smartAnnualInr / 12;
    }
    const arpuInr = s.paying > 0 ? mrr / s.paying : 0;
    return {
      exam,
      users: s.users,
      paying: s.paying,
      trialOrFree: s.trial,
      conversionPct,
      churnedRecently: s.churned,
      arpuInr,
    };
  });

  rows.sort((a, b) => b.users - a.users);

  return { rows };
}
