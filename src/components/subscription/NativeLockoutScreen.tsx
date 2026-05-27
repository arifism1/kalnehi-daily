"use client";

import { RefreshCw, LogOut } from "lucide-react";
import { useCallback, useState } from "react";

import { useAppSignOut } from "@/hooks/useAppSignOut";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

/**
 * Shown on the Android Capacitor shell when the 7-day free trial has ended
 * and the user has not yet subscribed.
 *
 * Companion-app model: this screen is informational only — no checkout button,
 * no Custom Tabs, no in-app purchase prompt. Users subscribe at kalnehi.com in
 * their browser independently, then return here and tap "Refresh status" (or
 * reopen the app) to regain access. This complies with Google Play's payment
 * policy for companion apps.
 *
 * Sign-out is provided so the user is never fully trapped: they can log out
 * and sign in with a different account or return after subscribing on the web.
 */
export function NativeLockoutScreen() {
  const { refetch } = useSubscriptionAccess();
  const { signOut, signingOut } = useAppSignOut();
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

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
          <span className="font-semibold text-kal-text">Smart Plan</span> at{" "}
          <span className="font-semibold text-kal-text">kalnehi.com</span> in
          your browser. Once subscribed, come back to this app and tap{" "}
          <span className="font-semibold text-kal-text">Refresh status</span>{" "}
          below.
        </p>

        {statusMsg ? (
          <p className="text-sm text-kal-text-secondary" role="status">
            {statusMsg}
          </p>
        ) : null}

        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={busy || signingOut}
            className="kal-glass-subtle flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-kal-text disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
            {busy ? "Checking…" : "Refresh status"}
          </button>

          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy || signingOut}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-kal-muted hover:text-kal-text disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}
