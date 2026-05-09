"use client";

import { Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useFreeTrialLiveEndsIn } from "@/hooks/useFreeTrialLiveEndsIn";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { FREE_TRIAL_VOICE_CAP_MINUTES } from "@/lib/freeTrial";
import * as storage from "@/lib/storage";
import { useAuthStore } from "@/store/useAuthStore";

const STORAGE_PREFIX = "kalnehi-free-trial-banner-dismissed";
const AUTO_DISMISS_MS = 5000;

export function FreeTrialWelcomeBanner() {
  const userId = useAuthStore((s) => s.user?.id);
  const { freeTrialActive, loading, trialStartedAt, freeTrialEndsAtIso } = useSubscriptionAccess();
  const [dismissed, setDismissed] = useState(true);

  const endsIn = useFreeTrialLiveEndsIn(freeTrialEndsAtIso, !!freeTrialActive && !!trialStartedAt);
  const dismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void storage
      .getItem(`${STORAGE_PREFIX}:${userId}`)
      .then((v) => {
        if (!cancelled) setDismissed(v === "1");
      })
      .catch(() => {
        if (!cancelled) setDismissed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persistDismiss = useCallback(() => {
    if (!userId) return;
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    void storage.setItem(`${STORAGE_PREFIX}:${userId}`, "1");
    setDismissed(true);
  }, [userId]);

  const show =
    !loading && !!userId && freeTrialActive && !dismissed && !!trialStartedAt;

  useEffect(() => {
    if (!show || !userId) return;
    dismissTimerRef.current = window.setTimeout(() => {
      dismissTimerRef.current = null;
      persistDismiss();
    }, AUTO_DISMISS_MS);
    return () => {
      if (dismissTimerRef.current !== null) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [show, userId, persistDismiss]);

  if (!show) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+52px+0.75rem)] z-[60] w-[min(32rem,calc(100vw-1.5rem))] -translate-x-1/2"
    >
      <div className="kal-trial-welcome-toast-in pointer-events-auto overflow-hidden rounded-2xl border border-kal-accent/25 bg-kal-bg-elevated shadow-[0_12px_40px_-16px_rgba(0,0,0,0.18)] dark:border-kal-accent/20 dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.45)]">
        <div className="relative px-4 py-3.5 sm:flex sm:items-center sm:gap-4 sm:px-5">
          <div className="flex shrink-0 items-center justify-center rounded-xl bg-kal-accent/20 p-2 text-kal-accent ring-1 ring-kal-accent/25">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} aria-hidden />
          </div>
          <div className="mt-3 min-w-0 flex-1 sm:mt-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-kal-accent">
              Welcome
            </p>
            <p className="mt-0.5 text-sm font-bold leading-snug text-kal-text sm:text-base">
              Your 7-day free trial has started!
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
            onClick={persistDismiss}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-kal-text-secondary transition-colors hover:bg-black/5 hover:text-kal-text dark:hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
