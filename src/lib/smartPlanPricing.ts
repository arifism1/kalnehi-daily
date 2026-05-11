/**
 * Consumer-facing Smart Plan amounts — keep in sync with Razorpay order routes
 * and {@link TIERS} monthly billing.
 */

import { TIERS } from "@/lib/subscriptionTiers";

/** Paise — same as `/api/six-month-plan` and verify route. */
export const SMART_PLAN_SIX_MONTH_PRICE_PAISE = 149900;

/** Paise — same as `/api/annual-plan` and verify route. */
export const SMART_PLAN_ANNUAL_PRICE_PAISE = 238800;

/** Introductory offer — original (MRP) monthly price for strikethrough display. */
export const SMART_PLAN_MONTHLY_MRP_DISPLAY = "₹399";

/** Introductory offer — MRP for 6 months (₹399 × 6) for strikethrough display. */
export const SMART_PLAN_SIX_MONTH_MRP_DISPLAY = "₹2,394";

/** Introductory offer — MRP for 12 months (₹399 × 12) for strikethrough display. */
export const SMART_PLAN_ANNUAL_MRP_DISPLAY = "₹4,788";

/** Introductory offer — savings vs MRP (marketing copy; keep aligned with MRP vs paid totals). */
export const SMART_PLAN_MONTHLY_SAVINGS_DISPLAY = "₹100";
export const SMART_PLAN_SIX_MONTH_SAVINGS_DISPLAY = "₹895";
export const SMART_PLAN_ANNUAL_SAVINGS_DISPLAY = "₹2,400";

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
