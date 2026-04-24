"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useState } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";
import {
  CinematicOnboarding,
  readCinematicOnboardingDone,
} from "@/components/onboarding/CinematicOnboarding";

const OnboardingWizard = dynamic(
  () =>
    import("@/components/onboarding/OnboardingWizard").then((m) => ({
      default: m.OnboardingWizard,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function OnboardingRouteLazy() {
  const [phase, setPhase] = useState<"init" | "cinematic" | "wizard">("init");

  useEffect(() => {
    setPhase(readCinematicOnboardingDone() ? "wizard" : "cinematic");
  }, []);

  const finishCinematic = useCallback(() => {
    setPhase("wizard");
  }, []);

  if (phase === "init") {
    return <RoutePageSkeleton />;
  }

  if (phase === "cinematic") {
    return <CinematicOnboarding onComplete={finishCinematic} />;
  }

  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <OnboardingWizard />
    </Suspense>
  );
}
