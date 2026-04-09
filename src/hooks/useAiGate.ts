"use client";

import { useCallback, useMemo } from "react";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import {
  canUseAi,
  getPhotoScansLimit,
  getTierConfig,
  getVoiceMinutesLimit,
  remainingPhotoScans,
  remainingVoiceMinutes,
} from "@/lib/subscriptionTiers";

type AiGateResult = {
  loading: boolean;
  hasPaidAccess: boolean;
  hasAiAccess: boolean;
  tierName: string;

  photoScansRemaining: number;
  photoScansLimit: number;
  photoScansUsed: number;

  voiceMinutesRemaining: number;
  voiceMinutesLimit: number;
  voiceMinutesUsed: number;

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

  const photoScansRemaining = useMemo(
    () =>
      remainingPhotoScans(
        tier,
        usage.photoScansUsed,
        usage.bonusPhotoScans,
        isTrialPeriod,
      ),
    [tier, usage.photoScansUsed, usage.bonusPhotoScans, isTrialPeriod],
  );

  const voiceMinutesRemaining = useMemo(
    () =>
      remainingVoiceMinutes(
        tier,
        usage.voiceMinutesUsed,
        usage.bonusVoiceMinutes,
        isTrialPeriod,
      ),
    [tier, usage.voiceMinutesUsed, usage.bonusVoiceMinutes, isTrialPeriod],
  );

  const photoScansLimit =
    getPhotoScansLimit(tier, isTrialPeriod) + usage.bonusPhotoScans;
  const voiceMinutesLimit =
    getVoiceMinutesLimit(tier, isTrialPeriod) + usage.bonusVoiceMinutes;

  const hasAiAccess = canUseAi(tier);
  const canDoPhotoScan = hasAiAccess && photoScansRemaining > 0;
  const canDoVoiceSession = hasAiAccess && voiceMinutesRemaining > 0;

  const photoScanStatus = hasAiAccess
    ? `${photoScansRemaining} of ${photoScansLimit} scans remaining`
    : "Upgrade to Pro for photo scanning";

  const voiceMinuteStatus = hasAiAccess
    ? `${voiceMinutesRemaining} of ${voiceMinutesLimit} minutes remaining`
    : "Upgrade to Pro for voice dictation";

  return {
    loading,
    hasPaidAccess,
    hasAiAccess,
    tierName: tierConfig.name,

    photoScansRemaining,
    photoScansLimit,
    photoScansUsed: usage.photoScansUsed,

    voiceMinutesRemaining,
    voiceMinutesLimit,
    voiceMinutesUsed: usage.voiceMinutesUsed,

    canDoPhotoScan,
    canDoVoiceSession,

    photoScanStatus,
    voiceMinuteStatus,

    refetch,
  };
}
