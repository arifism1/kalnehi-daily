import type { SubscriptionTier } from "@/lib/subscriptionTiers";

/**
 * My Plan / `surface: "upgrade"` (and similar): hide HelpyJi for Pro and Pro Max so
 * the widget targets Basic → higher tiers and non-subscribers. Not used on `/pricing`.
 */
export function isHelpyJiEligibleForTier(
  tier: SubscriptionTier | null | undefined,
): boolean {
  if (tier === "pro" || tier === "pro_max") return false;
  return true;
}

/** Pricing page: any signed-in user may use HelpyJi (compare tiers, Basic→Pro, Pro→Pro Max). */
export function isHelpyJiEligibleForPricingPage(
  user: { id: string } | null | undefined,
): boolean {
  return Boolean(user?.id);
}
