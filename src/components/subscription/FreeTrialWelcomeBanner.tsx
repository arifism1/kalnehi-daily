"use client";

import { Clock, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useFreeTrialLiveEndsIn } from "@/hooks/useFreeTrialLiveEndsIn";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { FREE_TRIAL_VOICE_CAP_MINUTES } from "@/lib/freeTrial";
import { useAuthStore } from "@/store/useAuthStore";

const STORAGE_PREFIX = "kalnehi-free-trial-banner-dismissed";

export function FreeTrialWelcomeBanner() {
  const userId = useAuthStore((s) => s.user?.id);
  const { freeTrialActive, loading, trialStartedAt, freeTrialEndsAtIso } = useSubscriptionAccess();
  const [dismissed, setDismissed] = useState(true);

  const endsIn = useFreeTrialLiveEndsIn(freeTrialEndsAtIso, !!freeTrialActive && !!trialStartedAt);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(`${STORAGE_PREFIX}:${userId}`);
      setDismissed(v === "1");
    } catch {
      setDismissed(false);
    }
  }, [userId]);

  const onDismiss = useCallback(() => {
    if (!userId) return;
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}:${userId}`, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, [userId]);

  if (loading || !userId || !freeTrialActive || dismissed || !trialStartedAt) {
    return null;
  }

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-kal-accent/20 bg-kal-card shadow-[0_12px_40px_-16px_rgba(0,0,0,0.15)] ring-1 ring-kal-accent/10 dark:border-kal-accent/20 dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.4)] dark:ring-kal-accent/10">
      <div className="relative flex items-center justify-center bg-gradient-to-r from-kal-accent/14 via-kal-accent/22 to-kal-accent/14 px-3 py-3.5 dark:from-kal-accent/12 dark:via-kal-accent/18 dark:to-kal-accent/12">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(255,122,0,0.05))] dark:bg-[linear-gradient(180deg,transparent,rgba(255,140,26,0.07))]"
          aria-hidden
        />
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-kal-accent/25 text-kal-accent shadow-inner ring-1 ring-kal-accent/25 dark:bg-kal-accent/22 dark:ring-kal-accent/30 sm:h-11 sm:w-11">
          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} aria-hidden />
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-1/2 flex h-10 w-10 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-xl text-kal-text-secondary transition-colors hover:bg-black/8 hover:text-kal-text dark:hover:bg-white/12"
          aria-label="Dismiss free trial notice"
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>

      <div className="relative overflow-hidden border-t border-kal-accent/10 bg-gradient-to-b from-kal-card to-kal-card-muted px-5 py-4 sm:px-6 sm:py-5">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,122,0,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,140,26,0.18),transparent)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-kal-accent/12 blur-2xl dark:bg-kal-accent/15"
          aria-hidden
        />

        <div className="relative max-w-prose">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-kal-accent">
            Welcome
          </p>
          <p className="mt-1.5 text-base font-bold leading-tight text-balance text-kal-text sm:text-lg">
            Your 1-day free trial has started!
          </p>
          {endsIn ? (
            <div
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1.5 text-xs font-semibold tabular-nums text-kal-accent dark:border-kal-accent/30 dark:bg-kal-accent-soft/90 sm:px-3.5 sm:text-sm"
              aria-live="polite"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" strokeWidth={2.25} aria-hidden />
              <span>{endsIn}</span>
            </div>
          ) : null}
          <p className="mt-3 text-xs leading-relaxed text-kal-text-secondary sm:text-sm">
            {FREE_TRIAL_VOICE_CAP_MINUTES} minutes of voice time — use it anytime before the clock
            above hits zero. Limits don&apos;t roll over.
          </p>
        </div>
      </div>
    </div>
  );
}
