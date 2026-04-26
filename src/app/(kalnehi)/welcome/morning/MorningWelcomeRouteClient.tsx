"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { MorningWelcomeScreen } from "@/components/welcome/MorningWelcomeScreen";
import { useMorningWelcomeData } from "@/components/welcome/hooks/useWelcomeScreenData";
import { isMorningTimeWindow, useWelcomeScreenStore } from "@/store/useWelcomeScreenStore";

export function MorningWelcomeRouteClient() {
  const router = useRouter();
  const today = useCalendarDate();
  const setLastMorningYmd = useWelcomeScreenStore((s) => s.setLastMorningYmd);
  const { firstName, examCountdownText, quote, loading } = useMorningWelcomeData();
  const {
    loading: subscriptionLoading,
    hasPaidAccess,
    freeTrialActive,
  } = useSubscriptionAccess();

  const welcomeEligible = hasPaidAccess || freeTrialActive;

  useEffect(() => {
    if (subscriptionLoading) return;
    if (!welcomeEligible || !isMorningTimeWindow()) {
      router.replace("/home");
    }
  }, [subscriptionLoading, welcomeEligible, router]);

  const onDismiss = useCallback(() => {
    setLastMorningYmd(today);
    router.replace("/home");
  }, [router, setLastMorningYmd, today]);

  const onCta = useCallback(() => {
    setLastMorningYmd(today);
    router.replace("/daily-plan");
  }, [router, setLastMorningYmd, today]);

  if (subscriptionLoading || loading) {
    return (
      <div
        className="flex min-h-dvh w-full items-center justify-center bg-[#FAF6F1]"
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  if (!welcomeEligible) {
    return null;
  }

  return (
    <MorningWelcomeScreen
      firstName={firstName}
      examCountdownText={examCountdownText}
      dailyQuote={quote}
      onDismiss={onDismiss}
      onCtaClick={onCta}
    />
  );
}
