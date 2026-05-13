"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useTourStore } from "@/store/useTourStore";

import { TourCelebration } from "./TourCelebration";
import { TourSpotlight } from "./TourSpotlight";
import { TourStepCard } from "./TourStepCard";
import { TourWelcomeModal } from "./TourWelcomeModal";
import { VoiceNudgeModal } from "./VoiceNudgeModal";
import { TOTAL_STEPS, TOUR_STEPS } from "./tourSteps";

const CELEBRATION_STEP = TOTAL_STEPS - 1; // 13
const WELCOME_STEP = 0;

/**
 * Thin orchestrator rendered inside `KalnehiChrome` (default branch only).
 *
 * Shows/hides the full tour based on:
 *  - user has completed onboarding
 *  - user has an active trial or paid access
 *  - tour has not been completed or dismissed
 *  - current page is /home  (or `?reset_tour=1` is present — dev-only reset)
 */
export function TourGate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { onboardingDone, hasPaidAccess, freeTrialActive } = useSubscriptionAccess();
  const allowAppWithoutPaid = hasPaidAccess || freeTrialActive;

  const { tourCompleted, currentStep, nextStep, skipTour, completeTour, resetTour, voiceNudgeShown } =
    useTourStore();

  // Dev-only reset via ?reset_tour=1
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      searchParams.get("reset_tour") === "1"
    ) {
      resetTour();
    }
  }, [searchParams, resetTour]);

  const isHome = pathname === "/home";
  const shouldShow = onboardingDone && allowAppWithoutPaid && !tourCompleted && isHome;
  const showVoiceNudge = onboardingDone && allowAppWithoutPaid && tourCompleted && !voiceNudgeShown;

  if (!shouldShow && !showVoiceNudge) return null;

  const step = TOUR_STEPS[currentStep];

  const isCelebration = currentStep === CELEBRATION_STEP;
  const isWelcome = currentStep === WELCOME_STEP;
  const isFeatureStep = !isWelcome && !isCelebration;

  function handleNext() {
    if (currentStep >= TOTAL_STEPS - 1) {
      completeTour();
    } else {
      nextStep();
    }
  }

  return (
    <>
      {shouldShow && (
        <>
          {/* ── Full-screen welcome ───────────────────────────────────────── */}
          <AnimatePresence>
            {isWelcome && (
              <TourWelcomeModal onStart={() => nextStep()} onSkip={skipTour} />
            )}
          </AnimatePresence>

          {/* ── Feature spotlight steps ───────────────────────────────────── */}
          <AnimatePresence>
            {isFeatureStep && (
              <TourSpotlight tourTarget={step?.tourTarget ?? null} />
            )}
          </AnimatePresence>

          {isFeatureStep && (
            <TourStepCard
              currentStep={currentStep}
              onNext={handleNext}
              onSkip={skipTour}
            />
          )}

          {/* ── Celebration ───────────────────────────────────────────────── */}
          <AnimatePresence>
            {isCelebration && <TourCelebration onFinish={completeTour} />}
          </AnimatePresence>
        </>
      )}

      {/* ── Voice nudge (shown once after tour completes or is skipped) ─── */}
      {showVoiceNudge && <VoiceNudgeModal />}
    </>
  );
}
