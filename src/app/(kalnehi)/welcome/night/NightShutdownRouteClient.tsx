"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { APP_HOME_PATH } from "@/config/appRoutes";
import { NightShutdownScreen } from "@/components/welcome/NightShutdownScreen";
import { useNightShutdownData } from "@/components/welcome/hooks/useWelcomeScreenData";

export function NightShutdownRouteClient() {
  const router = useRouter();
  const { summary, nightQuote } = useNightShutdownData();
  const {
    loading: subscriptionLoading,
    hasPaidAccess,
    freeTrialActive,
  } = useSubscriptionAccess();

  const welcomeEligible = hasPaidAccess || freeTrialActive;

  useEffect(() => {
    if (subscriptionLoading) return;
    if (!welcomeEligible) {
      router.replace(APP_HOME_PATH);
    }
  }, [subscriptionLoading, welcomeEligible, router]);

  const onClose = useCallback(() => {
    router.replace(APP_HOME_PATH);
  }, [router]);

  if (subscriptionLoading) {
    return (
      <div
        className="flex min-h-dvh w-full items-center justify-center bg-[#1A1209]"
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  if (!welcomeEligible) {
    return null;
  }

  return (
    <NightShutdownScreen
      summary={summary}
      nightQuote={nightQuote}
      onClose={onClose}
    />
  );
}
