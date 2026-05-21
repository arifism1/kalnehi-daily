"use client";

import { RefreshCw, ExternalLink } from "lucide-react";
import { useCallback, useState } from "react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

/** URL for the web-based checkout page, opened in Chrome Custom Tabs on Android. */
const CHECKOUT_URL = "https://www.kalnehi.com/upgrade";

/**
 * Shown when in-app checkout is unavailable (Android Capacitor shell) after
 * the welcome trial ends. Opens kalnehi.com/upgrade in Chrome Custom Tabs
 * (separate browser process) rather than the WebView, satisfying Google Play
 * billing policy.
 */
export function NativeLockoutScreen() {
  const { refetch } = useSubscriptionAccess();
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleOpenCheckout = useCallback(async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({
        url: CHECKOUT_URL,
        toolbarColor: "#FF7A00",
      });
    } catch {
      setStatusMsg("Could not open checkout. Please try again.");
    } finally {
      setBusy(false);
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
            disabled={busy}
            className="kal-btn-accent flex min-h-[48px] w-full items-center justify-center gap-2 disabled:opacity-60"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {busy ? "Opening…" : "Subscribe on Kalnehi.com"}
          </button>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={busy}
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
