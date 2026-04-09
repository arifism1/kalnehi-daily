"use client";

import { useMemo } from "react";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import {
  getFeatureAccess,
  isFeatureBlocked,
  isFeatureLimited,
  type FeatureAccess,
  type FeatureKey,
} from "@/lib/subscriptionTiers";

type FeatureAccessResult = {
  loading: boolean;
  tier: string | null;
  access: FeatureAccess;
  blocked: boolean;
  limited: boolean;
  allowed: boolean;
};

export function useFeatureAccess(feature: FeatureKey): FeatureAccessResult {
  const { loading, tier } = useSubscriptionAccess();

  return useMemo(() => {
    const access = getFeatureAccess(tier, feature);
    return {
      loading,
      tier,
      access,
      blocked: isFeatureBlocked(tier, feature),
      limited: isFeatureLimited(tier, feature),
      allowed: access === "allowed",
    };
  }, [loading, tier, feature]);
}
