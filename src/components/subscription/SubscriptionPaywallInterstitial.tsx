"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { TIERS } from "@/lib/subscriptionTiers";

/**
 * Blocks interaction with the route underneath while subscription is inactive.
 * Rendered by AppShell over inert main content.
 */
export function SubscriptionPaywallInterstitial({
  freeTrialEnded = false,
}: {
  /** After the 1-day welcome trial ended without a paid plan. */
  freeTrialEnded?: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const primaryRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      router.back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Go back"
        className="absolute inset-0 bg-kal-overlay backdrop-blur-sm"
        onClick={() => router.back()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="kal-glass-panel relative z-[81] w-full max-w-md rounded-2xl p-6 sm:rounded-2xl"
      >
        <div className="kal-glass-subtle mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full">
          <Lock className="h-6 w-6 text-kal-text-secondary" aria-hidden />
        </div>
        <h2
          id={titleId}
          className="text-center text-lg font-bold tracking-tight text-kal-text"
        >
          {freeTrialEnded ? "Free trial ended" : "Active plan required"}
        </h2>
        <p
          id={descId}
          className="mt-2 text-center text-sm leading-relaxed text-kal-muted"
        >
          {freeTrialEnded ? (
            <>
              Your 1-day welcome trial is over. Start a 2-day paid trial for{" "}
              <span className="font-semibold text-kal-text">{TIERS.pro.trialPriceDisplay}</span> — full
              Pro access, then {TIERS.pro.monthlyPriceDisplay}/month on AutoPay. Cancel anytime.
            </>
          ) : (
            <>
              Kalnehi Daily is a paid app — there is no free tier. Your subscription
              is not active right now. Choose a plan to keep using the app.
            </>
          )}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="kal-glass-subtle min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold text-kal-text sm:min-h-[44px] sm:px-5"
          >
            Go back
          </button>
          <Link
            ref={primaryRef}
            href="/pricing"
            className="kal-btn-accent min-h-[48px] sm:min-h-[44px]"
          >
            {freeTrialEnded ? "Start paid trial" : "View plans & pricing"}
          </Link>
        </div>
      </div>
    </div>
  );
}
