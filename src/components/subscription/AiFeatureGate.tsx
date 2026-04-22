"use client";

import Link from "next/link";
import { Lock, Mic } from "lucide-react";

import { useAiGate } from "@/hooks/useAiGate";
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
  } = useAiGate();

  if (loading) return <>{children}</>;

  if (!hasAiAccess) {
    return (
      <div className="kal-glass-panel flex flex-col items-center gap-4 rounded-2xl p-8 text-center">
        <Lock className="h-8 w-8 text-kal-text-secondary" />
        <h3 className="text-lg font-bold text-kal-text">Voice dictation needs an active trial or plan</h3>
        <p className="max-w-sm text-sm text-kal-text-secondary">
          Start the welcome trial or a paid plan to get voice minutes for AI planning and dictation.
        </p>
        <Link href="/pricing" className="kal-btn-accent">
          View plans
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
          {voiceMinuteStatus}. Buy extra credits on My Subscription for more voice minutes.
        </p>
        <Link href="/my-subscription" className="kal-btn-accent">
          Open My Subscription
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
