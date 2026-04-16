"use client";

import { useMemo } from "react";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import {
  FREE_TRIAL_PHOTO_CAP,
  FREE_TRIAL_VOICE_CAP_SECONDS,
  formatWelcomeVoiceTimeLeft,
} from "@/lib/freeTrial";
import {
  canUseAi,
  getPhotoScansLimit,
  getTierConfig,
  getVoiceMinutesLimit,
} from "@/lib/subscriptionTiers";

type AiGateResult = {
  loading: boolean;
  hasPaidAccess: boolean;
  hasAiAccess: boolean;
  tierName: string;

  /** True when the user is on a Basic plan within their 3-day trial window. */
  isBasicTrial: boolean;

  /** True during the 24h welcome trial (no paid subscription). */
  isWelcomeTrial: boolean;

  monthlyPhotoScanLimit: number;
  monthlyVoiceMinuteLimit: number;

  photoScansRemaining: number;
  photoScansLimit: number;
  photoScansUsed: number;

  /** Paid: minutes remaining (incl. bonus). Welcome: same as welcomeVoiceSecondsRemaining for display convenience. */
  voiceMinutesRemaining: number;
  voiceMinutesLimit: number;
  voiceMinutesUsed: number;

  /** Welcome trial only: seconds of voice left (0–180). Zero when not on welcome path. */
  welcomeVoiceSecondsRemaining: number;

  bonusPhotoScansRemaining: number;
  bonusVoiceMinutesRemaining: number;
  bonusPhotoScansNextExpiry: string | null;
  bonusVoiceMinutesNextExpiry: string | null;

  canDoPhotoScan: boolean;
  canDoVoiceSession: boolean;

  /** Short human-readable status for photo scans */
  photoScanStatus: string;
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
    freeTrialPhotoRemaining,
    freeTrialVoiceSecondsRemaining,
    trialPhotoScansUsed,
    trialVoiceSecondsUsed,
    freeTrialEndsAtIso,
  } = useSubscriptionAccess();

  const tierConfig = useMemo(() => getTierConfig(tier), [tier]);
  const isTrialPeriod = status === "trial";

  const monthlyPhotoScanLimit = getPhotoScansLimit(tier, isTrialPeriod);
  const monthlyVoiceMinuteLimit = getVoiceMinutesLimit(tier, isTrialPeriod);

  const paidAi = hasPaidAccess && canUseAi(tier, isTrialPeriod);

  const inWelcomeTrialFlow =
    !hasPaidAccess && (freeTrialActive || welcomeTrialEligibleUnstarted);

  const isWelcomeTrial = inWelcomeTrialFlow;

  const photoScansRemaining = useMemo(() => {
    if (paidAi) {
      const monthlyRem = Math.max(0, monthlyPhotoScanLimit - usage.photoScansUsed);
      return monthlyRem + usage.bonusPhotoScans;
    }
    if (inWelcomeTrialFlow) return freeTrialPhotoRemaining;
    return 0;
  }, [
    paidAi,
    inWelcomeTrialFlow,
    monthlyPhotoScanLimit,
    usage.photoScansUsed,
    usage.bonusPhotoScans,
    freeTrialPhotoRemaining,
  ]);

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

  const photoScansLimit = paidAi
    ? monthlyPhotoScanLimit + usage.bonusPhotoScans
    : inWelcomeTrialFlow
      ? FREE_TRIAL_PHOTO_CAP
      : 0;

  const voiceMinutesLimit = paidAi
    ? monthlyVoiceMinuteLimit + usage.bonusVoiceMinutes
    : inWelcomeTrialFlow
      ? FREE_TRIAL_VOICE_CAP_SECONDS / 60
      : 0;

  const photoScansUsed = paidAi ? usage.photoScansUsed : trialPhotoScansUsed;
  const voiceMinutesUsed = paidAi
    ? usage.voiceMinutesUsed
    : trialVoiceSecondsUsed / 60;

  const isBasicTrial = tier === "basic" && isTrialPeriod;
  const hasAiAccess = paidAi || inWelcomeTrialFlow;

  const canDoPhotoScan = paidAi
    ? photoScansRemaining > 0
    : inWelcomeTrialFlow && freeTrialPhotoRemaining > 0;

  const canDoVoiceSession = paidAi
    ? voiceMinutesRemaining > 0
    : inWelcomeTrialFlow && freeTrialVoiceSecondsRemaining > 0;

  const photoScanStatus = paidAi
    ? `${photoScansRemaining}/${photoScansLimit} scans`
    : inWelcomeTrialFlow
      ? `${freeTrialPhotoRemaining} scans left • 24h trial`
      : "Upgrade to Pro for photo scanning";

  const voiceMinuteStatus = paidAi
    ? `${voiceMinutesRemaining}/${voiceMinutesLimit} min`
    : inWelcomeTrialFlow
      ? `${formatWelcomeVoiceTimeLeft(freeTrialVoiceSecondsRemaining)} • 24h trial`
      : "Upgrade to Pro for voice dictation";

  return {
    loading,
    hasPaidAccess,
    hasAiAccess,
    tierName: tierConfig.name,
    isBasicTrial,
    isWelcomeTrial,

    monthlyPhotoScanLimit,
    monthlyVoiceMinuteLimit,

    photoScansRemaining,
    photoScansLimit,
    photoScansUsed,

    voiceMinutesRemaining,
    voiceMinutesLimit,
    voiceMinutesUsed,

    welcomeVoiceSecondsRemaining: inWelcomeTrialFlow ? freeTrialVoiceSecondsRemaining : 0,

    bonusPhotoScansRemaining: usage.bonusPhotoScans,
    bonusVoiceMinutesRemaining: usage.bonusVoiceMinutes,
    bonusPhotoScansNextExpiry: usage.bonusPhotoScansNextExpiry,
    bonusVoiceMinutesNextExpiry: usage.bonusVoiceMinutesNextExpiry,

    canDoPhotoScan,
    canDoVoiceSession,

    photoScanStatus,
    voiceMinuteStatus,

    freeTrialEndsAtIso,

    refetch,
  };
}
