"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { EnabledDashboardFeatureGate } from "@/components/features/EnabledDashboardFeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";
import { FeatureGate } from "@/components/subscription/FeatureGate";

const MeditationConsistencyPage = dynamic(
  () =>
    import("@/components/meditation/MeditationConsistencyPage").then((m) => ({
      default: m.MeditationConsistencyPage,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function MeditationConsistencyRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="meditation_consistency">
        <EnabledDashboardFeatureGate featureId="brain-yoga" title="Brain Yoga consistency">
          <MeditationConsistencyPage />
        </EnabledDashboardFeatureGate>
      </FeatureGate>
    </Suspense>
  );
}
