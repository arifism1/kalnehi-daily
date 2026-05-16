"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { EnabledDashboardFeatureGate } from "@/components/features/EnabledDashboardFeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";
import { FeatureGate } from "@/components/subscription/FeatureGate";

const PersonalMotivationPage = dynamic(
  () =>
    import("@/components/motivation/PersonalMotivationPage").then((m) => ({
      default: m.PersonalMotivationPage,
    })),
  { ssr: true, loading: () => <RoutePageSkeleton /> },
);

export default function MotivationRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="motivation">
        <EnabledDashboardFeatureGate featureId="personal-motivation" title="Personal Motivation">
          <PersonalMotivationPage />
        </EnabledDashboardFeatureGate>
      </FeatureGate>
    </Suspense>
  );
}
