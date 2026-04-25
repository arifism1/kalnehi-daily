"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { MorningWelcomeScreen } from "@/components/welcome/MorningWelcomeScreen";
import { useMorningWelcomeData } from "@/components/welcome/hooks/useWelcomeScreenData";
import { useAuthStore } from "@/store/useAuthStore";
import {
  shouldShowMorningForDate,
  useWelcomeScreenStore,
} from "@/store/useWelcomeScreenStore";

/**
 * Renders the morning welcome on {@link /home} when this calendar day hasn’t been
 * completed yet. Full-screen overlay (see z-index on the screen).
 */
export function WelcomeMorningHost() {
  const router = useRouter();
  const pathname = usePathname();
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const lastMorningYmd = useWelcomeScreenStore((s) => s.lastMorningYmd);
  const setLastMorningYmd = useWelcomeScreenStore((s) => s.setLastMorningYmd);
  const { firstName, examCountdownText, quote, loading } = useMorningWelcomeData();
  const {
    loading: subscriptionLoading,
    hasPaidAccess,
    freeTrialActive,
  } = useSubscriptionAccess();

  const welcomeEligible = hasPaidAccess || freeTrialActive;

  const shouldShow = shouldShowMorningForDate(today, lastMorningYmd);

  const handleDismissed = useCallback(() => {
    setLastMorningYmd(today);
  }, [setLastMorningYmd, today]);

  const handleCta = useCallback(() => {
    setLastMorningYmd(today);
    router.push("/daily-plan");
  }, [router, setLastMorningYmd, today]);

  if (pathname !== "/home" || !initialized || !user) return null;
  if (subscriptionLoading || loading) return null;
  if (!welcomeEligible) return null;
  if (!shouldShow) return null;

  return (
    <MorningWelcomeScreen
      firstName={firstName}
      examCountdownText={examCountdownText}
      dailyQuote={quote}
      onDismiss={handleDismissed}
      onCtaClick={handleCta}
    />
  );
}
