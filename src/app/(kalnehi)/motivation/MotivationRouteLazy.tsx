"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

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
        <PersonalMotivationPage />
      </FeatureGate>
    </Suspense>
  );
}
