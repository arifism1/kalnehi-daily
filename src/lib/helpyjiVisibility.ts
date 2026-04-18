import type { SubscriptionTier } from "@/lib/subscriptionTiers";

/**
 * My Plan / `surface: "upgrade"`: show HelpyJi only when the user has no active paid access
 * (subscribers use PrepBrain in-app). Not used on `/pricing`.
 */
export function isHelpyJiEligibleForTier(
  _tier: SubscriptionTier | null | undefined,
  hasPaidAccess: boolean,
): boolean {
  return !hasPaidAccess;
}

/** Pricing page: any signed-in user may use HelpyJi. */
export function isHelpyJiEligibleForPricingPage(
  user: { id: string } | null | undefined,
): boolean {
  return Boolean(user?.id);
}
