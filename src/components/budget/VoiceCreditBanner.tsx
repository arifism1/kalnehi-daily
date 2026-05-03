"use client";

import clsx from "clsx";
import Link from "next/link";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { FREE_TRIAL_VOICE_CAP_SECONDS } from "@/lib/freeTrial";
import { formatPaidVoiceTimeRemaining } from "@/lib/voiceSessionBilling";
import { canUseAi, getVoiceMinutesLimit } from "@/lib/subscriptionTiers";

function pctRemaining(remaining: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.max(0, (remaining / limit) * 100));
}

/**
 * Rich voice quota bar for the global voice sheet (trial + paid).
 */
export function VoiceCreditBanner() {
  const {
    loading,
    freeTrialActive,
    hasPaidAccess,
    freeTrialVoiceSecondsRemaining,
    usage,
    tier,
    status,
  } = useSubscriptionAccess();

  if (loading) return null;

  const isTrialPeriod = status === "trial";
  const monthlyLimit = getVoiceMinutesLimit(tier, isTrialPeriod);
  const paidAi = hasPaidAccess && canUseAi(tier, isTrialPeriod);

  if (paidAi) {
    const limitMin = monthlyLimit + usage.bonusVoiceMinutes;
    const remainingMin = Math.max(
      0,
      monthlyLimit - usage.voiceMinutesUsed + usage.bonusVoiceMinutes,
    );
    const pct = pctRemaining(remainingMin, limitMin);
    const warn = pct <= 10;
    const caution = pct <= 20 && !warn;
    const exhausted = remainingMin <= 0;

    return (
      <div
        className={clsx(
          "mx-3 mb-2 rounded-xl border px-3 py-2",
          warn || exhausted
            ? "border-red-500/35 bg-red-500/[0.07] dark:bg-red-950/25"
            : caution
              ? "border-amber-500/35 bg-amber-500/[0.07] dark:bg-amber-950/20"
              : "border-kal-border/60 bg-kal-card-muted/80",
        )}
      >
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
          <span className="text-kal-text-secondary">Voice this period</span>
          <span
            className={clsx(
              "tabular-nums",
              warn || exhausted ? "text-red-600 dark:text-red-400" : "text-kal-text",
            )}
          >
            {exhausted
              ? "Used up"
              : formatPaidVoiceTimeRemaining(remainingMin)}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-kal-border/80">
          <div
            className={clsx(
              "h-full rounded-full transition-[width] duration-300",
              warn || exhausted ? "bg-red-500" : caution ? "bg-amber-500" : "bg-kal-accent",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {exhausted ? (
          <Link
            href="/my-subscription"
            className="mt-2 block text-center text-xs font-semibold text-kal-accent hover:underline"
          >
            Upgrade for more voice time
          </Link>
        ) : null}
      </div>
    );
  }

  if (freeTrialActive && !hasPaidAccess) {
    const cap = FREE_TRIAL_VOICE_CAP_SECONDS / 60;
    const remainingMin = freeTrialVoiceSecondsRemaining / 60;
    const pct = pctRemaining(remainingMin, cap);
    const warn = pct <= 10;
    const caution = pct <= 20 && !warn;
    const exhausted = freeTrialVoiceSecondsRemaining <= 0;

    return (
      <div
        className={clsx(
          "mx-3 mb-2 rounded-xl border px-3 py-2",
          warn || exhausted
            ? "border-red-500/35 bg-red-500/[0.07] dark:bg-red-950/25"
            : caution
              ? "border-amber-500/35 bg-amber-500/[0.07] dark:bg-amber-950/20"
              : "border-kal-border/60 bg-kal-card-muted/80",
        )}
      >
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
          <span className="text-kal-text-secondary">Trial voice</span>
          <span
            className={clsx(
              "tabular-nums",
              warn || exhausted ? "text-red-600 dark:text-red-400" : "text-kal-text",
            )}
          >
            {exhausted
              ? "Used up"
              : `${Math.floor(remainingMin)}m ${Math.round((remainingMin % 1) * 60)}s left`}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-kal-border/80">
          <div
            className={clsx(
              "h-full rounded-full transition-[width] duration-300",
              warn || exhausted ? "bg-red-500" : caution ? "bg-amber-500" : "bg-kal-accent",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {exhausted ? (
          <Link
            href="/my-subscription"
            className="mt-2 block text-center text-xs font-semibold text-kal-accent hover:underline"
          >
            Upgrade for more voice time
          </Link>
        ) : null}
      </div>
    );
  }

  return null;
}
