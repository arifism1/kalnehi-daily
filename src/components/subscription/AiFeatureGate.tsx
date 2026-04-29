"use client";

import Link from "next/link";
import { Lock, Mic } from "lucide-react";

import { useAiGate } from "@/hooks/useAiGate";
import { usePlatform } from "@/hooks/usePlatform";
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
  const { isApp } = usePlatform();

  if (loading) return <>{children}</>;

  if (!hasAiAccess) {
    return (
      <div className="kal-glass-panel flex flex-col items-center gap-4 rounded-2xl p-8 text-center">
        <Lock className="h-8 w-8 text-kal-text-secondary" />
        <h3 className="text-lg font-bold text-kal-text">Voice dictation requires Smart Plan</h3>
        <p className="max-w-sm text-sm text-kal-text-secondary">
          Your 3-day free trial has ended. Subscribe to Smart Plan (₹399/month) to get 100 minutes of voice per month.
        </p>
        {isApp ? (
          <p className="max-w-sm text-xs text-kal-muted">
            Account upgrades are available on the website. Check WhatsApp or email for activation instructions.
          </p>
        ) : (
          <Link href="/pricing" className="kal-btn-accent">
            Subscribe — ₹399/month
          </Link>
        )}
      </div>
    );
  }

  const atLimit = !canDoVoiceSession;

  if (atLimit) {
    if (isWelcomeTrial && !hasPaidAccess) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-kal-accent/25 bg-gradient-to-br from-kal-accent/10 to-kal-card-muted p-8 text-center shadow-inner dark:border-kal-accent/20">
          <Mic className="h-8 w-8 text-kal-accent" />
          <h3 className="text-lg font-bold text-kal-text">Trial voice limit reached</h3>
          <p className="max-w-sm text-sm text-kal-text-secondary">
            You&apos;ve used all 5 minutes of voice included in your 3-day free trial. Upgrade to Smart Plan for{" "}
            {TIERS.pro.monthlyPriceDisplay}/month and get 100 minutes of voice every month.
          </p>
          {isApp ? (
            <p className="max-w-sm text-xs text-kal-muted">
              Account upgrades are available on the website.
            </p>
          ) : (
            <Link href="/pricing" className="kal-btn-accent">
              Upgrade to Smart Plan
            </Link>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
        <Mic className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        <h3 className="text-lg font-bold text-kal-text">Monthly voice limit reached</h3>
        <p className="max-w-sm text-sm text-kal-text-secondary">
          {voiceMinuteStatus}. Buy extra voice credits on My Subscription for more minutes.
        </p>
        {isApp ? (
          <p className="max-w-sm text-xs text-kal-muted">
            Purchases are available on the website.
          </p>
        ) : (
          <Link href="/my-subscription" className="kal-btn-accent">
            Open My Subscription
          </Link>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
