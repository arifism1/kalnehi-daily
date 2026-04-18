"use client";

import Link from "next/link";
import { Loader2, Lock } from "lucide-react";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import {
  isFeatureBlocked,
  FEATURE_LABELS,
  type FeatureKey,
} from "@/lib/subscriptionTiers";

type Props = {
  feature: FeatureKey;
  children: React.ReactNode;
};

export function FeatureGate({ feature, children }: Props) {
  const { loading, tier, hasPaidAccess, freeTrialActive } = useSubscriptionAccess();
  const trialUnlocksNav = hasPaidAccess || freeTrialActive;

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-kal-accent/60" aria-label="Loading…" />
      </div>
    );
  }

  if (!trialUnlocksNav && isFeatureBlocked(tier, feature)) {
    const label = FEATURE_LABELS[feature];
    return (
      <div className="kal-glass-panel mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl p-10 text-center">
        <div className="kal-glass-subtle flex h-14 w-14 items-center justify-center rounded-full">
          <Lock className="h-6 w-6 text-kal-text-secondary" />
        </div>
        <h2 className="text-xl font-bold text-kal-text">{label.name}</h2>
        <p className="text-sm leading-relaxed text-kal-text-secondary">
          {label.upgradeHint}
        </p>
        <Link href="/pricing" className="kal-btn-accent min-h-[48px]">
          View Plans
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
