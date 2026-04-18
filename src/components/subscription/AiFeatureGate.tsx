"use client";

import Link from "next/link";
import { Lock, Mic } from "lucide-react";
import { useEffect, useState } from "react";

import { useAiGate } from "@/hooks/useAiGate";
import { formatWelcomeTrialEndsIn } from "@/lib/freeTrial";
import { TIERS } from "@/lib/subscriptionTiers";

type Props = {
  children: React.ReactNode;
};

export function AiFeatureGate({ children }: Props) {
  const {
    loading,
    hasAiAccess,
    hasPaidAccess,
    isWelcomeTrial,
    canDoVoiceSession,
    voiceMinuteStatus,
    voiceMinutesRemaining,
    freeTrialEndsAtIso,
  } = useAiGate();

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!isWelcomeTrial || !freeTrialEndsAtIso) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isWelcomeTrial, freeTrialEndsAtIso]);

  if (loading) return <>{children}</>;

  if (!hasAiAccess) {
    return (
      <div className="kal-glass-panel flex flex-col items-center gap-4 rounded-2xl p-8 text-center">
        <Lock className="h-8 w-8 text-kal-text-secondary" />
        <h3 className="text-lg font-bold text-kal-text">Voice Dictation is a Pro feature</h3>
        <p className="max-w-sm text-sm text-kal-text-secondary">
          Subscribe to Pro to unlock AI voice planning and dictation.
        </p>
        <Link href="/pricing" className="kal-btn-accent">
          View Plans
        </Link>
      </div>
    );
  }

  const atLimit = !canDoVoiceSession;

  if (atLimit) {
    if (isWelcomeTrial && !hasPaidAccess) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-kal-accent/25 bg-gradient-to-br from-kal-accent/10 to-kal-card-muted p-8 text-center shadow-inner dark:border-kal-accent/20">
          <Mic className="h-8 w-8 text-kal-accent" />
          <h3 className="text-lg font-bold text-kal-text">Welcome trial limit reached</h3>
          <p className="max-w-sm text-sm text-kal-text-secondary">
            You&apos;ve used all welcome voice time in your 1-day trial. Start a 2-day paid trial for{" "}
            {TIERS.pro.trialPriceDisplay}, then {TIERS.pro.monthlyPriceDisplay}/month. Cancel anytime.
          </p>
          <Link href="/pricing" className="kal-btn-accent">
            Start 2-day paid trial
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
        <Mic className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        <h3 className="text-lg font-bold text-kal-text">Monthly limit reached</h3>
        <p className="max-w-sm text-sm text-kal-text-secondary">
          {voiceMinuteStatus}. Buy extra credits on My Plan for more voice minutes.
        </p>
        <Link href="/my-plan" className="kal-btn-accent">
          Open My Plan
        </Link>
      </div>
    );
  }

  const remaining = voiceMinutesRemaining;
  const statusText = voiceMinuteStatus;
  const countdown =
    isWelcomeTrial && freeTrialEndsAtIso
      ? formatWelcomeTrialEndsIn(freeTrialEndsAtIso, nowMs)
      : null;

  return (
    <>
      <div className="kal-glass-subtle mb-2 flex min-h-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg px-3 py-1.5">
        <span className="flex min-w-0 items-center gap-2 text-xs text-kal-text-secondary">
          <Mic className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">{statusText}</span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {countdown ? (
            <span className="text-[0.65rem] font-semibold tabular-nums text-kal-accent sm:text-xs">
              {countdown}
            </span>
          ) : null}
          {remaining <= 3 && hasPaidAccess ? (
            <Link href="/my-plan" className="text-xs font-semibold text-kal-accent hover:underline">
              Buy more
            </Link>
          ) : isWelcomeTrial ? (
            <Link href="/pricing" className="text-xs font-semibold text-kal-accent hover:underline">
              Upgrade
            </Link>
          ) : null}
        </div>
      </div>
      {children}
    </>
  );
}
