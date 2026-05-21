import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import { dateKeyIST } from "@/lib/admin/istDates";
import { loadAdminPricingInr, paymentKindToInr } from "@/lib/admin/pricing";

export type RevenueSnapshot = {
  mrrInr: number;
  arrInr: number;
  revenueMonthlyPlanInr: number;
  revenueAnnualPlanInr: number;
  revenueSmartTrialInr: number;
  arpuInr: number;
  arpuMonthlyInr: number;
  arpuAnnualInr: number;
  payingUserCount: number;
  payingMonthlyCount: number;
  payingAnnualCount: number;
  newMrrThisMonthInr: number;
  churnedMrrThisMonthInr: number;
  netMrrChangeInr: number;
  graceUserCount: number;
  monthlyVsAnnualPercent: { monthlyPct: number; annualPct: number };
  autopayDistribution: { months: number; count: number }[];
  revenueByDay: { day: string; inr: number }[];
  paymentRowsAnalyzed: number;
};

function monthKeyIST(iso: string): string {
  const d = new Date(iso);
  const y = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata", year: "numeric" });
  const m = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata", month: "2-digit" });
  return `${y}-${m}`;
}

export async function getRevenueSnapshot(): Promise<RevenueSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const pricing = await loadAdminPricingInr();

  const [profilesRes, paymentsRes] = await Promise.all([
    admin
      .from("user_profiles")
      .select(
        "user_id, subscription_status, subscription_plan, subscription_start_date, subscription_end_date, subscription_cancelled_at, subscription_autopay_months_total, payment_grace_until",
      ),
    admin.from("razorpay_processed_payments").select("kind, created_at, user_id").limit(8000),
  ]);

  const profiles = (profilesRes.data ?? []) as {
    user_id: string | null;
    subscription_status: string | null;
    subscription_plan: string | null;
    subscription_start_date: string | null;
    subscription_end_date: string | null;
    subscription_cancelled_at: string | null;
    subscription_autopay_months_total: number | null;
    payment_grace_until: string | null;
  }[];

  const paying = profiles.filter((p) => {
    if (p.subscription_status !== "active" && p.subscription_status !== "cancelled") return false;
    if (!p.subscription_end_date) return false;
    return new Date(p.subscription_end_date) > new Date();
  });

  const payingMonthly = paying.filter((p) => p.subscription_plan === "monthly");
  const payingAnnual = paying.filter((p) => p.subscription_plan === "annual");
  const nPay = paying.length;
  const mrrContributionMonthly = payingMonthly.length * pricing.smartMonthlyInr;
  const mrrContributionAnnual = payingAnnual.length * (pricing.smartAnnualInr / 12);
  const mrrInr = mrrContributionMonthly + mrrContributionAnnual;
  const arrInr = mrrInr * 12;

  const autopayMap = new Map<number, number>();
  for (const p of paying) {
    const m = p.subscription_autopay_months_total ?? 1;
    autopayMap.set(m, (autopayMap.get(m) ?? 0) + 1);
  }
  const autopayDistribution = [...autopayMap.entries()]
    .toSorted((a, b) => a[0] - b[0])
    .map(([months, count]) => ({ months, count }));

  const totalPlan = payingMonthly.length + payingAnnual.length;
  const monthlyVsAnnualPercent =
    totalPlan === 0
      ? { monthlyPct: 0, annualPct: 0 }
      : {
          monthlyPct: (payingMonthly.length / totalPlan) * 100,
          annualPct: (payingAnnual.length / totalPlan) * 100,
        };

  const arpuInr = nPay > 0 ? mrrInr / nPay : 0;
  const arpuMonthlyInr = payingMonthly.length > 0 ? pricing.smartMonthlyInr : 0;
  const arpuAnnualInr = payingAnnual.length > 0 ? pricing.smartAnnualInr / 12 : 0;

  const payments = (paymentsRes.data ?? []) as { kind: string; created_at: string; user_id: string }[];

  let revenueMonthlyPlanInr = 0;
  let revenueAnnualPlanInr = 0;
  let revenueSmartTrialInr = 0;
  const byDay = new Map<string, number>();

  for (const pay of payments) {
    const inr = paymentKindToInr(pay.kind, pricing);
    const day = dateKeyIST(new Date(pay.created_at));
    byDay.set(day, (byDay.get(day) ?? 0) + inr);
    if (pay.kind === "plan_upgrade") revenueMonthlyPlanInr += inr;
    else if (pay.kind === "annual_plan") revenueAnnualPlanInr += inr;
    else if (pay.kind === "waitlist_skip") revenueSmartTrialInr += inr;
  }

  let newMrrThisMonthInr = 0;
  const thisMonthKey = monthKeyIST(new Date().toISOString());

  for (const p of paying) {
    if (!p.subscription_start_date) continue;
    if (monthKeyIST(p.subscription_start_date) === thisMonthKey) {
      if (p.subscription_plan === "monthly") newMrrThisMonthInr += pricing.smartMonthlyInr;
      if (p.subscription_plan === "annual") newMrrThisMonthInr += pricing.smartAnnualInr / 12;
    }
  }

  let churnedMrrThisMonthInr = 0;
  for (const p of profiles) {
    if (!p.subscription_cancelled_at) continue;
    if (monthKeyIST(p.subscription_cancelled_at) !== thisMonthKey) continue;
    if (p.subscription_plan === "monthly") churnedMrrThisMonthInr += pricing.smartMonthlyInr;
    if (p.subscription_plan === "annual") churnedMrrThisMonthInr += pricing.smartAnnualInr / 12;
  }

  const graceUserCount = profiles.filter(
    (p) => p.payment_grace_until && new Date(p.payment_grace_until) > new Date(),
  ).length;

  const revenueByDay = [...byDay.entries()]
    .toSorted((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([day, inr]) => ({ day, inr }));

  return {
    mrrInr,
    arrInr,
    revenueMonthlyPlanInr,
    revenueAnnualPlanInr,
    revenueSmartTrialInr,
    arpuInr,
    arpuMonthlyInr,
    arpuAnnualInr,
    payingUserCount: nPay,
    payingMonthlyCount: payingMonthly.length,
    payingAnnualCount: payingAnnual.length,
    newMrrThisMonthInr,
    churnedMrrThisMonthInr,
    netMrrChangeInr: newMrrThisMonthInr - churnedMrrThisMonthInr,
    graceUserCount,
    monthlyVsAnnualPercent,
    autopayDistribution,
    revenueByDay,
    paymentRowsAnalyzed: payments.length,
  };
}
