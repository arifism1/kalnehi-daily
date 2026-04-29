"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { usePlatform } from "@/hooks/usePlatform";
import { TIERS } from "@/lib/subscriptionTiers";

/**
 * Blocks interaction with the route underneath while subscription is inactive.
 * Rendered by AppShell over inert main content.
 */
export function SubscriptionPaywallInterstitial({
  freeTrialEnded = false,
}: {
  /** After the 3-day free trial ended without a paid plan. */
  freeTrialEnded?: boolean;
}) {
  const router = useRouter();
  const { isApp } = usePlatform();
  const titleId = useId();
  const descId = useId();
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isApp) backButtonRef.current?.focus();
    else primaryRef.current?.focus();
  }, [isApp]);

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
        className="kal-glass-panel relative z-[81] flex min-h-0 w-full max-w-md max-h-[min(92dvh,40rem)] flex-col overflow-hidden rounded-2xl sm:rounded-2xl"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-6 [-webkit-overflow-scrolling:touch] sm:px-6">
        <div className="kal-glass-subtle mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full">
          <Lock className="h-6 w-6 text-kal-text-secondary" aria-hidden />
        </div>
        <h2
          id={titleId}
          className="text-center text-lg font-bold tracking-tight text-kal-text"
        >
          {freeTrialEnded ? "Your 3-day trial has ended" : "Smart Plan required"}
        </h2>
        <p
          id={descId}
          className="mt-2 text-center text-sm leading-relaxed text-kal-muted"
        >
          {freeTrialEnded ? (
            <>
              Your 3-day free trial is over. Subscribe to{" "}
              <span className="font-semibold text-kal-text">Smart Plan</span> for{" "}
              <span className="font-semibold text-kal-text">{TIERS.pro.monthlyPriceDisplay}/month</span> — 2 million Mastermind tokens and 100 minutes of voice every month. Cancel anytime.
            </>
          ) : (
            <>
              A subscription is required to use Kalnehi Daily. Your plan is not
              active right now. Subscribe to Smart Plan to continue.
            </>
          )}
        </p>
        {freeTrialEnded && (
          <p className="mt-3 text-center text-xs leading-relaxed text-kal-muted">
            The ₹19 waitlist skip is for new users only — it does not extend or restart a
            trial. Only Smart Plan ({TIERS.pro.monthlyPriceDisplay}/month) continues your
            access.
          </p>
        )}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-kal-border/50 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          <button
            ref={backButtonRef}
            type="button"
            onClick={() => router.back()}
            className="kal-glass-subtle min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold text-kal-text sm:min-h-[44px] sm:px-5"
          >
            Go back
          </button>
          {!isApp && (
            <Link
              ref={primaryRef}
              href="/pricing"
              className="kal-btn-accent min-h-[48px] sm:min-h-[44px]"
            >
              {freeTrialEnded ? `Subscribe — ${TIERS.pro.monthlyPriceDisplay}/month` : "View plans & pricing"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
