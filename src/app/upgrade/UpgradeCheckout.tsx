"use client";

import Script from "next/script";
import { Check, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";

import {
  activateRazorpayMonthlySubscription,
  createRazorpayMonthlySubscription,
} from "@/actions/subscription";
import { KalSpinner } from "@/components/loading/KalSpinner";
import {
  AUTOPAY_MONTHS_MAX,
  AUTOPAY_MONTHS_MIN,
  clampAutopayMonths,
  DEFAULT_AUTOPAY_MONTHS,
} from "@/lib/autopayMonths";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAuthStore } from "@/store/useAuthStore";

const AUTOPAY_PRESET_MONTHS = [1, 2, 3, 6, 12] as const;

/** URL of the web-only checkout page opened in Chrome Custom Tabs on Android. */
const ANDROID_CHECKOUT_URL = "https://www.kalnehi.com/upgrade";

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function navigateHomeAfterPurchase() {
  if (typeof window === "undefined") return;
  window.location.assign("/home");
}

// ── Android-native checkout card ──────────────────────────────────────────────

/**
 * Shown on Android (Capacitor shell). Opens kalnehi.com/upgrade in Chrome
 * Custom Tabs — a separate browser process — so payment never runs inside
 * the WebView. This satisfies Google Play billing policy.
 *
 * Compliant wording per Play Store review guidance:
 * - Button clearly names the external website (kalnehi.com)
 * - Disclaimer names the payment processor (Razorpay)
 * - "browserFinished" listener is registered ONCE on mount (not inside onClick)
 *   and polls subscription when the tab closes
 */
function NativeCheckoutCard({
  months,
  setMonths,
  hasPaidAccess,
}: {
  months: number;
  setMonths: (m: number) => void;
  hasPaidAccess: boolean;
}) {
  const { refetch } = useSubscriptionAccess();
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks whether WE opened the tab, so the listener ignores any other
  // browserFinished events (e.g. from other parts of the app).
  const isCheckoutOpenRef = useRef(false);
  // Guards against stacking a second poll if the user somehow triggers two closes.
  const isPollingRef = useRef(false);

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
    // Guard: don't stack a second poll run.
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    setPolling(true);
    setStatusMsg("Checking your subscription… this usually takes a few seconds.");

    // Immediate first check.
    refetch({ silent: true });

    // Then check every 1.5 s.
    stopTimers();
    pollIntervalRef.current = setInterval(() => {
      refetch({ silent: true });
    }, 1500);

    // Hard stop after 30 s — do one final non-silent refetch so state is
    // up-to-date before showing the manual-refresh nudge.
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

  // Keep a ref so the browserFinished effect always calls the latest startPoll
  // without needing to re-register the listener when refetch changes.
  const startPollRef = useRef(startPoll);
  useEffect(() => {
    startPollRef.current = startPoll;
  }, [startPoll]);

  // Register the browserFinished listener ONCE on mount.
  // Using a ref for startPoll means this effect runs only once (empty deps),
  // so a user tapping Subscribe multiple times cannot stack listeners.
  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    void (async () => {
      try {
        const { Browser } = await import("@capacitor/browser");
        listenerHandle = await Browser.addListener("browserFinished", () => {
          // Ignore if we didn't open the tab (e.g. another component used Browser).
          if (!isCheckoutOpenRef.current) return;
          isCheckoutOpenRef.current = false;
          startPollRef.current();
        });
      } catch (err) {
        console.warn("[NativeCheckoutCard] Could not register browserFinished listener:", err);
      }
    })();

    return () => {
      listenerHandle?.remove();
      stopTimers();
      isPollingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — listener registered once for the component lifetime

  // When hasPaidAccess becomes true while we are polling, navigate home.
  useEffect(() => {
    if (!hasPaidAccess || !polling) return;
    stopTimers();
    isPollingRef.current = false;
    setPolling(false);
    setBusy(false);
    setStatusMsg(null);
    navigateHomeAfterPurchase();
  }, [hasPaidAccess, polling, stopTimers]);

  const handleOpenCheckout = useCallback(async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const { Browser } = await import("@capacitor/browser");
      // Arm the already-registered listener before opening the tab.
      isCheckoutOpenRef.current = true;
      await Browser.open({
        url: ANDROID_CHECKOUT_URL,
        toolbarColor: "#FF7A00",
      });
    } catch {
      isCheckoutOpenRef.current = false;
      setBusy(false);
      setStatusMsg("Could not open checkout. Please try again.");
    }
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setBusy(true);
    setStatusMsg("Checking subscription status…");
    await refetch();
    setBusy(false);
    setStatusMsg(null);
  }, [refetch]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 bg-kal-page px-6 py-16 pb-[max(4rem,env(safe-area-inset-bottom))]">
      <header className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-kal-accent">
          Kalnehi Preparation OS
        </p>
        <h1 className="font-display text-2xl font-semibold leading-tight text-kal-text sm:text-3xl">
          Active Plan
        </h1>
        <p className="text-sm text-kal-muted">
          Choose your autopay period, then subscribe securely on kalnehi.com.
        </p>
      </header>

      <div className="kal-card-surface space-y-6 p-8">
        {/* Transparent external-payment disclosure — required for Play Store */}
        <div className="flex items-start gap-3 rounded-xl border border-kal-border bg-kal-card-muted/40 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-kal-accent" aria-hidden />
          <p className="text-xs leading-relaxed text-kal-text-secondary">
            Tapping Subscribe will open{" "}
            <span className="font-semibold text-kal-text">kalnehi.com</span> in your
            browser to complete payment securely with Razorpay. Your study data stays
            in the app.
          </p>
        </div>

        {/* Autopay period selector */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-kal-text-secondary">
            Autopay period
          </p>
          <div className="flex flex-wrap gap-2">
            {AUTOPAY_PRESET_MONTHS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(clampAutopayMonths(m))}
                className={`min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition-colors ${
                  months === m
                    ? "border-kal-accent bg-kal-accent text-white"
                    : "border-kal-border bg-kal-card-muted text-kal-text hover:bg-kal-accent/10"
                }`}
              >
                {m} mo
              </button>
            ))}
          </div>
          <label className="mt-4 flex flex-col gap-2 text-sm">
            <span className="text-kal-muted">
              Custom months ({AUTOPAY_MONTHS_MIN}–{AUTOPAY_MONTHS_MAX})
            </span>
            <input
              type="number"
              min={AUTOPAY_MONTHS_MIN}
              max={AUTOPAY_MONTHS_MAX}
              value={months}
              onChange={(e) =>
                setMonths(
                  clampAutopayMonths(Number.parseInt(e.target.value, 10) || DEFAULT_AUTOPAY_MONTHS),
                )
              }
              className="min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text caret-kal-accent transition-colors duration-200 [color-scheme:light] focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 dark:[color-scheme:dark]"
            />
          </label>
        </div>

        {statusMsg ? (
          <p className="text-sm leading-relaxed text-kal-text-secondary" role="status">
            {statusMsg}
          </p>
        ) : null}

        {/* Primary CTA — opens Chrome Custom Tabs, never Razorpay JS in WebView */}
        <button
          type="button"
          onClick={() => void handleOpenCheckout()}
          disabled={busy || polling}
          className="kal-btn-accent flex min-h-[52px] w-full items-center justify-center gap-2 disabled:opacity-60"
        >
          <ExternalLink className="h-5 w-5" aria-hidden />
          {polling ? "Checking payment…" : busy ? "Opening checkout…" : "Subscribe securely on Kalnehi.com"}
        </button>

        {/* Secondary: manual refresh after paying */}
        <button
          type="button"
          onClick={() => void handleManualRefresh()}
          disabled={busy || polling}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent/10 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh subscription status
        </button>

        <p className="text-center text-xs text-kal-muted">
          Prefer the account dashboard?{" "}
          <Link href="/account" className="font-semibold text-kal-accent underline">
            Account
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function UpgradeCheckout() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const { refetch, hasPaidAccess } = useSubscriptionAccess();

  const [months, setMonths] = useState(DEFAULT_AUTOPAY_MONTHS);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webhookPollFallbackErrorRef = useRef<string>("");
  const awaitingPaidProfileRef = useRef(false);
  const razorpayMonthlyHandlerEnteredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollDeadlineRef.current) clearTimeout(pollDeadlineRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasPaidAccess || !awaitingPaidProfileRef.current) return;
    awaitingPaidProfileRef.current = false;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollDeadlineRef.current) {
      clearTimeout(pollDeadlineRef.current);
      pollDeadlineRef.current = null;
    }
    window.setTimeout(() => {
      setConfirmingPayment(false);
      setErrorMsg(null);
      setBusy(false);
      navigateHomeAfterPurchase();
    }, 0);
  }, [hasPaidAccess]);

  useEffect(() => {
    if (initialized && !user) {
      router.replace(`/auth?next=${encodeURIComponent("/upgrade")}`);
    }
  }, [initialized, user, router]);

  // ── Web Razorpay flow (unchanged for PWA / desktop) ────────────────────────
  const handleSubscribe = useCallback(async () => {
    if (!window.Razorpay || !user) return;
    setConfirmingPayment(false);
    awaitingPaidProfileRef.current = false;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollDeadlineRef.current) {
      clearTimeout(pollDeadlineRef.current);
      pollDeadlineRef.current = null;
    }
    setBusy(true);
    setErrorMsg(null);
    razorpayMonthlyHandlerEnteredRef.current = false;

    const res = await createRazorpayMonthlySubscription("pro", months);
    if (!res.ok) {
      setBusy(false);
      setErrorMsg(res.error);
      return;
    }

    const rzp = new window.Razorpay({
      key: res.keyId,
      subscription_id: res.subscriptionId,
      name: "Kalnehi Daily",
      description: `Kalnehi Preparation OS Active Plan · ${months} month${months === 1 ? "" : "s"}`,
      prefill: { email: user.email ?? "" },
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
      },
      handler: async (response: RazorpayCheckoutResponse) => {
        razorpayMonthlyHandlerEnteredRef.current = true;
        setBusy(true);
        setConfirmingPayment(false);
        let activateRes: Awaited<ReturnType<typeof activateRazorpayMonthlySubscription>>;
        try {
          activateRes = await activateRazorpayMonthlySubscription({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
          });
        } catch (e) {
          const raw = e instanceof Error ? e.message : String(e);
          const msg =
            raw === "Forbidden."
              ? "Billing could not verify this page (origin). Refresh or open https://www.kalnehi.com/upgrade and try again."
              : raw || "Could not activate your plan. Please try again.";
          setErrorMsg(msg);
          setBusy(false);
          setConfirmingPayment(false);
          return;
        }
        if (!activateRes.ok) {
          if (activateRes.suggestWebhookPoll) {
            webhookPollFallbackErrorRef.current = activateRes.error;
            awaitingPaidProfileRef.current = true;
            setConfirmingPayment(true);
            setBusy(true);
            setErrorMsg(
              "Confirming payment with our servers… This usually finishes in a few seconds.",
            );
            refetch({ silent: true });
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = setInterval(() => {
              refetch({ silent: true });
            }, 1200);
            if (pollDeadlineRef.current) clearTimeout(pollDeadlineRef.current);
            pollDeadlineRef.current = setTimeout(() => {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              pollDeadlineRef.current = null;
              awaitingPaidProfileRef.current = false;
              setConfirmingPayment(false);
              setBusy(false);
              setErrorMsg(webhookPollFallbackErrorRef.current);
            }, 24_000);
            return;
          }
          setErrorMsg(activateRes.error);
          setBusy(false);
          return;
        }
        await refetch();
        setBusy(false);
        navigateHomeAfterPurchase();
      },
      modal: {
        ondismiss: () => {
          window.setTimeout(() => {
            if (razorpayMonthlyHandlerEnteredRef.current) return;
            setBusy(false);
          }, 120);
        },
      },
    });
    rzp.open();
  }, [months, user, refetch]);

  if (!initialized) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-kal-page px-6 py-16">
        <KalSpinner size="lg" message="Loading checkout…" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-kal-page px-6 py-16">
        <KalSpinner size="lg" message="Redirecting to sign in…" />
      </div>
    );
  }

  // ── Android native shell: Chrome Custom Tabs checkout (Play-compliant) ─────
  if (Capacitor.isNativePlatform()) {
    return (
      <NativeCheckoutCard
        months={months}
        setMonths={setMonths}
        hasPaidAccess={hasPaidAccess}
      />
    );
  }

  // ── Web / PWA: existing Razorpay JS modal flow ─────────────────────────────
  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setCheckoutReady(true)}
      />

      <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 bg-kal-page px-6 py-16 pb-[max(4rem,env(safe-area-inset-bottom))]">
        <header className="space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-kal-accent">
            Kalnehi Preparation OS
          </p>
          <h1 className="font-display text-2xl font-semibold leading-tight text-kal-text sm:text-3xl">
            Active Plan
          </h1>
          <p className="text-sm text-kal-muted">
            Complete checkout on the web with UPI or cards. After payment you&apos;ll return to the app.
          </p>
        </header>

        <div className="kal-card-surface space-y-6 p-8">
          <div className="flex items-start gap-3 rounded-xl border border-kal-border bg-kal-card-muted/40 px-4 py-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-kal-accent" aria-hidden />
            <p className="text-xs leading-relaxed text-kal-text-secondary">
              Encrypted checkout via Razorpay. Your study data stays in Kalnehi — this screen only
              handles billing.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-kal-text-secondary">
              Autopay period
            </p>
            <div className="flex flex-wrap gap-2">
              {AUTOPAY_PRESET_MONTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(clampAutopayMonths(m))}
                  className={`min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition-colors ${
                    months === m
                      ? "border-kal-accent bg-kal-accent text-white"
                      : "border-kal-border bg-kal-card-muted text-kal-text hover:bg-kal-accent/10"
                  }`}
                >
                  {m} mo
                </button>
              ))}
            </div>
            <label className="mt-4 flex flex-col gap-2 text-sm">
              <span className="text-kal-muted">
                Custom months ({AUTOPAY_MONTHS_MIN}–{AUTOPAY_MONTHS_MAX})
              </span>
              <input
                type="number"
                min={AUTOPAY_MONTHS_MIN}
                max={AUTOPAY_MONTHS_MAX}
                value={months}
                onChange={(e) =>
                  setMonths(
                    clampAutopayMonths(Number.parseInt(e.target.value, 10) || DEFAULT_AUTOPAY_MONTHS),
                  )
                }
                className="min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text caret-kal-accent transition-colors duration-200 [color-scheme:light] focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 dark:[color-scheme:dark]"
              />
            </label>
          </div>

          {errorMsg ? (
            <p
              className={
                confirmingPayment ? "text-sm text-kal-text-secondary" : "text-sm text-red-600"
              }
              role={confirmingPayment ? "status" : "alert"}
            >
              {errorMsg}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSubscribe()}
            disabled={busy || !checkoutReady}
            className="kal-btn-accent flex min-h-[52px] w-full items-center justify-center gap-2 disabled:opacity-60"
          >
            <Check className="h-5 w-5" aria-hidden />
            {busy
              ? confirmingPayment
                ? "Confirming payment…"
                : "Opening checkout…"
              : "Pay with Razorpay"}
          </button>

          <p className="text-center text-xs text-kal-muted">
            Prefer the account dashboard first?{" "}
            <Link href="/account" className="font-semibold text-kal-accent underline">
              Account
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
