"use client";

import { useMemo } from "react";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import {
  FREE_TRIAL_VOICE_CAP_SECONDS,
  formatWelcomeVoiceTimeLeft,
} from "@/lib/freeTrial";
import { canUseAi, getTierConfig, getVoiceMinutesLimit } from "@/lib/subscriptionTiers";

/**
 * AI gate for voice dictation quotas and welcome-trial voice time.
 */
type AiGateResult = {
  loading: boolean;
  hasPaidAccess: boolean;
  hasAiAccess: boolean;
  tierName: string;

  /** Legacy: always false with single Pro plan. */
  isBasicTrial: boolean;

  /** True during the 24h welcome trial (no paid subscription). */
  isWelcomeTrial: boolean;

  monthlyVoiceMinuteLimit: number;

  /** Paid: minutes remaining (incl. bonus). Welcome: same as welcomeVoiceSecondsRemaining for display convenience. */
  voiceMinutesRemaining: number;
  voiceMinutesLimit: number;
  voiceMinutesUsed: number;

  /** Welcome trial only: seconds of voice left (0–180). Zero when not on welcome path. */
  welcomeVoiceSecondsRemaining: number;

  bonusVoiceMinutesRemaining: number;
  bonusVoiceMinutesNextExpiry: string | null;

  canDoVoiceSession: boolean;

  /** Short human-readable status for voice minutes */
  voiceMinuteStatus: string;

  freeTrialEndsAtIso: string | null;

  refetch: () => void;
};

export function useAiGate(): AiGateResult {
  const {
    loading,
    hasPaidAccess,
    tier,
    usage,
    refetch,
    status,
    freeTrialActive,
    welcomeTrialEligibleUnstarted,
    freeTrialVoiceSecondsRemaining,
    trialVoiceSecondsUsed,
    freeTrialEndsAtIso,
  } = useSubscriptionAccess();

  const tierConfig = useMemo(() => getTierConfig(tier), [tier]);
  const isTrialPeriod = status === "trial";

  const monthlyVoiceMinuteLimit = getVoiceMinutesLimit(tier, isTrialPeriod);

  const paidAi = hasPaidAccess && canUseAi(tier, isTrialPeriod);

  const inWelcomeTrialFlow =
    !hasPaidAccess && (freeTrialActive || welcomeTrialEligibleUnstarted);

  const isWelcomeTrial = inWelcomeTrialFlow;

  const voiceMinutesRemaining = useMemo(() => {
    if (paidAi) {
      const monthlyRem = Math.max(0, monthlyVoiceMinuteLimit - usage.voiceMinutesUsed);
      return monthlyRem + usage.bonusVoiceMinutes;
    }
    if (inWelcomeTrialFlow) return freeTrialVoiceSecondsRemaining / 60;
    return 0;
  }, [
    paidAi,
    inWelcomeTrialFlow,
    monthlyVoiceMinuteLimit,
    usage.voiceMinutesUsed,
    usage.bonusVoiceMinutes,
    freeTrialVoiceSecondsRemaining,
  ]);

  const voiceMinutesLimit = paidAi
    ? monthlyVoiceMinuteLimit + usage.bonusVoiceMinutes
    : inWelcomeTrialFlow
      ? FREE_TRIAL_VOICE_CAP_SECONDS / 60
      : 0;

  const voiceMinutesUsed = paidAi
    ? usage.voiceMinutesUsed
    : trialVoiceSecondsUsed / 60;

  const isBasicTrial = false;
  const hasAiAccess = paidAi || inWelcomeTrialFlow;

  const canDoVoiceSession = paidAi
    ? voiceMinutesRemaining > 0
    : inWelcomeTrialFlow && freeTrialVoiceSecondsRemaining > 0;

  const voiceMinuteStatus = paidAi
    ? `${voiceMinutesRemaining}/${voiceMinutesLimit} min`
    : inWelcomeTrialFlow
      ? `${formatWelcomeVoiceTimeLeft(freeTrialVoiceSecondsRemaining)} • 1-day trial`
      : "Upgrade to Pro for voice dictation";

  return {
    loading,
    hasPaidAccess,
    hasAiAccess,
    tierName: tierConfig.name,
    isBasicTrial,
    isWelcomeTrial,

    monthlyVoiceMinuteLimit,

    voiceMinutesRemaining,
    voiceMinutesLimit,
    voiceMinutesUsed,

    welcomeVoiceSecondsRemaining: inWelcomeTrialFlow ? freeTrialVoiceSecondsRemaining : 0,

    bonusVoiceMinutesRemaining: usage.bonusVoiceMinutes,
    bonusVoiceMinutesNextExpiry: usage.bonusVoiceMinutesNextExpiry,

    canDoVoiceSession,

    voiceMinuteStatus,

    freeTrialEndsAtIso,

    refetch,
  };
}
