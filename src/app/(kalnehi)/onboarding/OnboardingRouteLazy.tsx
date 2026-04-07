"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const OnboardingWizard = dynamic(
  () =>
    import("@/components/onboarding/OnboardingWizard").then((m) => ({
      default: m.OnboardingWizard,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function OnboardingRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <OnboardingWizard />
    </Suspense>
  );
}
