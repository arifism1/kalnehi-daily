"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

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
  const { loading, tier } = useSubscriptionAccess();

  if (loading) return <>{children}</>;

  if (isFeatureBlocked(tier, feature)) {
    const label = FEATURE_LABELS[feature];
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-kal-border bg-kal-card p-10 text-center kal-shadow-card">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kal-card-muted">
          <Lock className="h-6 w-6 text-kal-text-secondary" />
        </div>
        <h2 className="text-xl font-bold text-kal-text">{label.name}</h2>
        <p className="text-sm leading-relaxed text-kal-text-secondary">
          {label.upgradeHint}
        </p>
        <Link
          href="/pricing"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-kal-accent px-8 py-3 text-sm font-bold text-kal-accent-foreground"
        >
          View Plans
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
