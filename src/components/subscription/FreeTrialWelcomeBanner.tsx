"use client";

import { Sparkles, X } from "lucide-react";
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
    <div className="mb-4 overflow-hidden rounded-2xl border border-kal-accent/25 bg-gradient-to-br from-kal-accent/12 via-kal-card to-kal-card-muted shadow-[0_12px_40px_-16px_rgba(0,0,0,0.15)] dark:border-kal-accent/20 dark:from-kal-accent/10 dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.4)]">
      <div className="relative px-4 py-3.5 sm:flex sm:items-center sm:gap-4 sm:px-5">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-kal-accent/15 blur-2xl"
          aria-hidden
        />
        <div className="flex shrink-0 items-center justify-center rounded-xl bg-kal-accent/20 p-2 text-kal-accent ring-1 ring-kal-accent/25">
          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} aria-hidden />
        </div>
        <div className="mt-3 min-w-0 flex-1 sm:mt-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-kal-accent">
            Welcome
          </p>
          <p className="mt-0.5 text-sm font-bold leading-snug text-kal-text sm:text-base">
            Your 1-day free trial has started!
          </p>
          {endsIn ? (
            <p className="mt-1 text-xs font-semibold tabular-nums text-kal-accent sm:text-sm">
              {endsIn}
            </p>
          ) : null}
          <p className="mt-1 text-xs leading-relaxed text-kal-text-secondary sm:text-sm">
            {FREE_TRIAL_VOICE_CAP_MINUTES} minutes of voice time — use it anytime before the clock
            above hits zero. Limits don&apos;t roll over.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-kal-text-secondary transition-colors hover:bg-black/5 hover:text-kal-text dark:hover:bg-white/10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
