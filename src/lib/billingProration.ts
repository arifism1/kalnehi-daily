import { differenceInCalendarDays } from "date-fns";

import type { SubscriptionTier } from "@/lib/subscriptionTiers";
import { TIERS } from "@/lib/subscriptionTiers";

/** Days left in the current access window (from today through subscription end, calendar days). */
export function billingCycleRemainingCalendarDays(
  subscriptionEndDateIso: string | null,
  now: Date = new Date(),
): number {
  if (!subscriptionEndDateIso) return 0;
  const end = new Date(subscriptionEndDateIso);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, differenceInCalendarDays(end, now));
}

/**
 * Proration factor for monthly plans: min(remaining, 30) / 30 so we never charge more than
 * one month of price difference on a long cycle edge case.
 */
export function prorationFactorRemainingDays(remainingCalendarDays: number): number {
  if (remainingCalendarDays <= 0) return 0;
  const capped = Math.min(remainingCalendarDays, 30);
  return capped / 30;
}

export function computeTierUpgradeProrationPaise(
  fromTier: SubscriptionTier,
  toTier: SubscriptionTier,
  subscriptionEndDateIso: string | null,
  now: Date = new Date(),
): {
  remainingDays: number;
  prorationFactor: number;
  amountPaise: number;
} {
  const oldP = TIERS[fromTier].monthlyPricePaise;
  const newP = TIERS[toTier].monthlyPricePaise;
  const delta = newP - oldP;
  if (delta <= 0) {
    return { remainingDays: 0, prorationFactor: 0, amountPaise: 0 };
  }
  let remainingDays = billingCycleRemainingCalendarDays(subscriptionEndDateIso, now);
  const end = subscriptionEndDateIso ? new Date(subscriptionEndDateIso) : null;
  if (
    remainingDays === 0 &&
    end &&
    !Number.isNaN(end.getTime()) &&
    end.getTime() > now.getTime()
  ) {
    remainingDays = 1;
  }
  const prorationFactor = prorationFactorRemainingDays(remainingDays);
  const raw = delta * prorationFactor;
  const amountPaise = Math.max(100, Math.round(raw));
  return { remainingDays, prorationFactor, amountPaise };
}

export function formatUpgradeProrationLabel(
  amountPaise: number,
  remainingDays: number,
): string {
  const rupees = Math.round(amountPaise / 100);
  const r = rupees.toLocaleString("en-IN");
  const daysForCopy = Math.min(Math.max(remainingDays, 1), 30);
  return `Pay ₹${r} now (prorated for ${daysForCopy} day${daysForCopy === 1 ? "" : "s"} remaining this month)`;
}
