"use client";

import Link from "next/link";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

/**
 * Inline, non-blocking upgrade prompt shown when AI tokens hit 0.
 * Only shown when welcomeTrialExpiredNoPay OR token budget exhausted.
 * Shows ₹19 option only if !hasHadTrial.
 */
export function UpgradePrompt() {
  const { welcomeTrialExpiredNoPay, hasHadTrial, freeTrialActive, hasPaidAccess, loading } =
    useSubscriptionAccess();

  if (loading || hasPaidAccess) return null;
  if (!welcomeTrialExpiredNoPay && !freeTrialActive) return null;

  const showSkip = !hasHadTrial;

  return (
    <div className="my-3 rounded-xl border border-kal-accent/25 bg-kal-accent/[0.06] p-4">
      <p className="text-sm font-semibold text-kal-text">
        {welcomeTrialExpiredNoPay
          ? "You've used your free trial."
          : "You've used your free Mastermind tokens."}
      </p>
      <p className="mt-0.5 text-xs text-kal-text-secondary">
        Smart Plan gives you 20 lakh tokens every month.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/pricing#subscribe"
          className="inline-flex min-h-[36px] items-center rounded-full bg-kal-accent px-4 text-sm font-bold text-white shadow-sm hover:brightness-105"
        >
          Upgrade to Smart Plan →
        </Link>
        {showSkip && (
          <Link
            href="/waitlist/position"
            className="inline-flex min-h-[36px] items-center text-sm font-semibold text-kal-accent hover:underline"
          >
            Or skip the waitlist for ₹19 →
          </Link>
        )}
      </div>
    </div>
  );
}
