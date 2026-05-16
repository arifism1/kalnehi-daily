"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { KalSpinner } from "@/components/loading/KalSpinner";
import {
  resolveEffectiveEnabledFeatures,
  SETTINGS_OPT_IN_DEFAULT_OFF_IDS,
} from "@/lib/dashboardFeatures";
import { useEnabledFeaturesStore } from "@/store/useEnabledFeaturesStore";

type Props = {
  featureId: (typeof SETTINGS_OPT_IN_DEFAULT_OFF_IDS)[number];
  title: string;
  children: React.ReactNode;
};

export function EnabledDashboardFeatureGate({ featureId, title, children }: Props) {
  const storedFeatures = useEnabledFeaturesStore((s) => s.enabledFeatures);
  const hydratedFromProfile = useEnabledFeaturesStore((s) => s.hydratedFromProfile);

  if (!hydratedFromProfile) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <KalSpinner size="md" />
      </div>
    );
  }

  const effective = resolveEffectiveEnabledFeatures(storedFeatures);
  if (!effective.includes(featureId)) {
    return (
      <div className="kal-glass-panel mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl p-10 text-center">
        <div className="kal-glass-subtle flex h-14 w-14 items-center justify-center rounded-full">
          <LayoutDashboard className="h-6 w-6 text-kal-text-secondary" aria-hidden />
        </div>
        <h2 className="kal-section-heading">{title}</h2>
        <p className="text-sm leading-relaxed text-kal-text-secondary">
          Turn this tool on under Customize My Features in Settings to use it here.
        </p>
        <Link href="/settings#customize-features-heading" className="kal-btn-accent min-h-[48px]">
          Open Settings
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
