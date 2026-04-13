"use client";

import { useCallback, useMemo } from "react";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
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

  monthlyPhotoScanLimit: number;
  monthlyVoiceMinuteLimit: number;

  photoScansRemaining: number;
  photoScansLimit: number;
  photoScansUsed: number;

  voiceMinutesRemaining: number;
  voiceMinutesLimit: number;
  voiceMinutesUsed: number;

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

  refetch: () => void;
};

export function useAiGate(): AiGateResult {
  const { loading, hasPaidAccess, tier, usage, refetch, status } =
    useSubscriptionAccess();

  const tierConfig = useMemo(() => getTierConfig(tier), [tier]);
  const isTrialPeriod = status === "trial";

  const monthlyPhotoScanLimit = getPhotoScansLimit(tier, isTrialPeriod);
  const monthlyVoiceMinuteLimit = getVoiceMinutesLimit(tier, isTrialPeriod);

  const photoScansRemaining = useMemo(() => {
    const monthlyRem = Math.max(0, monthlyPhotoScanLimit - usage.photoScansUsed);
    return monthlyRem + usage.bonusPhotoScans;
  }, [monthlyPhotoScanLimit, usage.photoScansUsed, usage.bonusPhotoScans]);

  const voiceMinutesRemaining = useMemo(() => {
    const monthlyRem = Math.max(0, monthlyVoiceMinuteLimit - usage.voiceMinutesUsed);
    return monthlyRem + usage.bonusVoiceMinutes;
  }, [monthlyVoiceMinuteLimit, usage.voiceMinutesUsed, usage.bonusVoiceMinutes]);

  const photoScansLimit = monthlyPhotoScanLimit + usage.bonusPhotoScans;
  const voiceMinutesLimit = monthlyVoiceMinuteLimit + usage.bonusVoiceMinutes;

  const isBasicTrial = tier === "basic" && isTrialPeriod;
  const hasAiAccess = canUseAi(tier, isTrialPeriod);
  const canDoPhotoScan = hasAiAccess && photoScansRemaining > 0;
  const canDoVoiceSession = hasAiAccess && voiceMinutesRemaining > 0;

  const photoScanStatus = hasAiAccess
    ? `${photoScansRemaining}/${photoScansLimit} scans`
    : "Upgrade to Pro for photo scanning";

  const voiceMinuteStatus = hasAiAccess
    ? `${voiceMinutesRemaining}/${voiceMinutesLimit} min`
    : "Upgrade to Pro for voice dictation";

  return {
    loading,
    hasPaidAccess,
    hasAiAccess,
    tierName: tierConfig.name,
    isBasicTrial,

    monthlyPhotoScanLimit,
    monthlyVoiceMinuteLimit,

    photoScansRemaining,
    photoScansLimit,
    photoScansUsed: usage.photoScansUsed,

    voiceMinutesRemaining,
    voiceMinutesLimit,
    voiceMinutesUsed: usage.voiceMinutesUsed,

    bonusPhotoScansRemaining: usage.bonusPhotoScans,
    bonusVoiceMinutesRemaining: usage.bonusVoiceMinutes,
    bonusPhotoScansNextExpiry: usage.bonusPhotoScansNextExpiry,
    bonusVoiceMinutesNextExpiry: usage.bonusVoiceMinutesNextExpiry,

    canDoPhotoScan,
    canDoVoiceSession,

    photoScanStatus,
    voiceMinuteStatus,

    refetch,
  };
}
