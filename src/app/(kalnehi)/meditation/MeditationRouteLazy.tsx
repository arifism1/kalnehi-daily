"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { EnabledDashboardFeatureGate } from "@/components/features/EnabledDashboardFeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";
import { FeatureGate } from "@/components/subscription/FeatureGate";

const MeditationPage = dynamic(
  () =>
    import("@/components/meditation/MeditationPage").then((m) => ({
      default: m.MeditationPage,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function MeditationRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="meditation">
        <EnabledDashboardFeatureGate featureId="brain-yoga" title="Brain Yoga">
          <MeditationPage />
        </EnabledDashboardFeatureGate>
      </FeatureGate>
    </Suspense>
  );
}
