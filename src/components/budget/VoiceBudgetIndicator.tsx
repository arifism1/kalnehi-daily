"use client";

import clsx from "clsx";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { FREE_TRIAL_VOICE_CAP_MINUTES } from "@/lib/freeTrial";
import { TIERS } from "@/lib/subscriptionTiers";

const SMART_PLAN_VOICE_MINUTES = TIERS.pro.voiceMinutesPerMonth;

/**
 * Shows voice budget in a compact indicator.
 * Trial: X min / 5 min remaining.
 * Smart Plan: X min remaining.
 */
export function VoiceBudgetIndicator() {
  const {
    freeTrialActive,
    hasPaidAccess,
    freeTrialVoiceSecondsRemaining,
    usage,
    loading,
  } = useSubscriptionAccess();

  if (loading || (!freeTrialActive && !hasPaidAccess)) return null;

  if (freeTrialActive && !hasPaidAccess) {
    const remainingMin = freeTrialVoiceSecondsRemaining / 60;
    const pct = remainingMin / FREE_TRIAL_VOICE_CAP_MINUTES;
    const exhausted = freeTrialVoiceSecondsRemaining <= 0;

    const colorClass = exhausted
      ? "text-red-500"
      : pct < 0.25
      ? "text-orange-500"
      : pct < 0.5
      ? "text-amber-500"
      : "text-kal-muted";

    return (
      <span className={clsx("inline-flex items-center gap-1 text-xs font-medium tabular-nums", colorClass)}>
        <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
        {exhausted
          ? "Voice: used up"
          : `Voice: ${Math.floor(remainingMin)}m ${Math.round((remainingMin % 1) * 60)}s`}
      </span>
    );
  }

  // Smart Plan: use voice_minutes_used_this_month.
  const usedMin = usage.voiceMinutesUsed;
  const remaining = Math.max(0, SMART_PLAN_VOICE_MINUTES - usedMin);
  const pct = remaining / SMART_PLAN_VOICE_MINUTES;

  const colorClass =
    pct < 0.25 ? "text-orange-500" : pct < 0.5 ? "text-amber-500" : "text-kal-muted";

  function fmtHours(min: number): string {
    if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
    return `${Math.floor(min)}m`;
  }

  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs font-medium tabular-nums", colorClass)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      Voice: {fmtHours(remaining)} left
    </span>
  );
}
