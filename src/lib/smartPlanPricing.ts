/**
 * Consumer-facing Smart Plan amounts — keep in sync with Razorpay order routes
 * and {@link TIERS} monthly billing.
 */

import { TIERS } from "@/lib/subscriptionTiers";

/** Paise — same as `/api/six-month-plan` and verify route. */
export const SMART_PLAN_SIX_MONTH_PRICE_PAISE = 215400;

/** Paise — same as `/api/annual-plan` and verify route. */
export const SMART_PLAN_ANNUAL_PRICE_PAISE = 359100;

export const SMART_PLAN_MONTHLY_DISPLAY = TIERS.pro.monthlyPriceDisplay;

/** e.g. ₹3,591 */
export function formatInrFromPaise(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Whole rupees, rounded — chip labels like ₹299/mo vs ₹359/mo. */
export function effectiveMonthlyRupeeRounded(totalPaise: number, months: number): number {
  if (months <= 0) return 0;
  return Math.round(totalPaise / 100 / months);
}

/** e.g. "₹359/mo" */
export function smartPlanEffectiveMonthlyMoLabel(totalPaise: number, months: number): string {
  return `₹${effectiveMonthlyRupeeRounded(totalPaise, months)}/mo`;
}

export const SMART_PLAN_SIX_MONTH_TOTAL_DISPLAY =
  formatInrFromPaise(SMART_PLAN_SIX_MONTH_PRICE_PAISE);

export const SMART_PLAN_ANNUAL_TOTAL_DISPLAY =
  formatInrFromPaise(SMART_PLAN_ANNUAL_PRICE_PAISE);

export const SMART_PLAN_SIX_MONTH_BILLING_LABEL = `${SMART_PLAN_SIX_MONTH_TOTAL_DISPLAY}/6 months`;

export const SMART_PLAN_ANNUAL_BILLING_LABEL = `${SMART_PLAN_ANNUAL_TOTAL_DISPLAY}/year`;
