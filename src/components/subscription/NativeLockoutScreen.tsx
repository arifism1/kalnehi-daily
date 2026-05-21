"use client";

import { RefreshCw, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

/** URL for the web-based checkout page, opened in Chrome Custom Tabs on Android. */
const CHECKOUT_URL = "https://www.kalnehi.com/upgrade";

/**
 * Shown when in-app checkout is unavailable (Android Capacitor shell) after
 * the welcome trial ends. Opens kalnehi.com/upgrade in Chrome Custom Tabs
 * (separate browser process) rather than the WebView, satisfying Google Play
 * billing policy.
 *
 * Auto-polls subscription status when Chrome Custom Tabs closes so the user
 * is unblocked without needing to tap "Refresh status" manually.
 */
export function NativeLockoutScreen() {
  const { refetch, hasPaidAccess } = useSubscriptionAccess();
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingRef = useRef(false);
  // Set to true when WE opened the tab so the listener ignores unrelated events.
  const isCheckoutOpenRef = useRef(false);

  const stopTimers = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollDeadlineRef.current) {
      clearTimeout(pollDeadlineRef.current);
      pollDeadlineRef.current = null;
    }
  }, []);

  const startPoll = useCallback(() => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    setPolling(true);
    setStatusMsg("Checking your subscription… this usually takes a few seconds.");

    refetch({ silent: true });

    stopTimers();
    pollIntervalRef.current = setInterval(() => {
      refetch({ silent: true });
    }, 1500);

    // Hard stop after 30 s — nudge the user to refresh manually if nothing arrived.
    pollDeadlineRef.current = setTimeout(() => {
      stopTimers();
      isPollingRef.current = false;
      setPolling(false);
      setBusy(false);
      void refetch();
      setStatusMsg(
        "If you just paid, tap Refresh status below. Otherwise reopen the app after subscribing.",
      );
    }, 30_000);
  }, [refetch, stopTimers]);

  // Keep a stable ref so the browserFinished effect (empty deps, registered once)
  // always calls the latest startPoll without re-registering the listener.
  const startPollRef = useRef(startPoll);
  useEffect(() => {
    startPollRef.current = startPoll;
  }, [startPoll]);

  // Register browserFinished listener once on mount.
  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    void (async () => {
      try {
        const { Browser } = await import("@capacitor/browser");
        listenerHandle = await Browser.addListener("browserFinished", () => {
          if (!isCheckoutOpenRef.current) return;
          isCheckoutOpenRef.current = false;
          startPollRef.current();
        });
      } catch (err) {
        console.warn("[NativeLockoutScreen] Could not register browserFinished listener:", err);
      }
    })();

    return () => {
      listenerHandle?.remove();
      stopTimers();
      isPollingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — listener registered once for the component lifetime

  // When hasPaidAccess becomes true while polling, stop timers (AppShell will unmount this).
  useEffect(() => {
    if (!hasPaidAccess || !polling) return;
    stopTimers();
    isPollingRef.current = false;
    setPolling(false);
    setBusy(false);
    setStatusMsg(null);
  }, [hasPaidAccess, polling, stopTimers]);

  const handleOpenCheckout = useCallback(async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const { Browser } = await import("@capacitor/browser");
      isCheckoutOpenRef.current = true;
      await Browser.open({
        url: CHECKOUT_URL,
        toolbarColor: "#FF7A00",
      });
    } catch {
      isCheckoutOpenRef.current = false;
      setBusy(false);
      setStatusMsg("Could not open checkout. Please try again.");
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setBusy(true);
    setStatusMsg("Checking subscription status…");
    await refetch();
    setBusy(false);
    setStatusMsg(null);
  }, [refetch]);

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-kal-page p-6">
      <div className="kal-glass-panel mx-auto flex max-w-md flex-col gap-5 rounded-2xl px-8 py-10 text-center shadow-lg">
        <h2 className="font-display text-lg font-semibold leading-snug text-kal-text">
          Your trial has ended
        </h2>
        <p className="text-sm leading-relaxed text-kal-text-secondary">
          To keep using Kalnehi, subscribe to the{" "}
          <span className="font-semibold text-kal-text">Smart Plan</span>. Tap the
          button below to complete payment securely via Razorpay on{" "}
          <span className="font-semibold text-kal-text">kalnehi.com</span>, then
          return to this app.
        </p>

        {statusMsg ? (
          <p className="text-sm text-kal-text-secondary" role="status">
            {statusMsg}
          </p>
        ) : null}

        <div className="flex w-full max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleOpenCheckout()}
            disabled={busy || polling}
            className="kal-btn-accent flex min-h-[48px] w-full items-center justify-center gap-2 disabled:opacity-60"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {polling ? "Checking payment…" : busy ? "Opening…" : "Subscribe on Kalnehi.com"}
          </button>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={busy || polling}
            className="kal-glass-subtle flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-kal-text disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh status
          </button>
        </div>
      </div>
    </div>
  );
}
