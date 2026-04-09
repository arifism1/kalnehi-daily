"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

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
        <MeditationConsistencyPage />
      </FeatureGate>
    </Suspense>
  );
}
