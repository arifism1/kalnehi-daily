"use client";

import Script from "next/script";
import { Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

export function UpgradeCheckout() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const { refetch } = useSubscriptionAccess();

  const [months, setMonths] = useState(DEFAULT_AUTOPAY_MONTHS);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);

  useEffect(() => {
    if (initialized && !user) {
      router.replace(`/auth?next=${encodeURIComponent("/upgrade")}`);
    }
  }, [initialized, user, router]);

  const handleSubscribe = useCallback(async () => {
    if (!window.Razorpay || !user) return;
    setBusy(true);
    setErrorMsg(null);

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
        setBusy(true);
        const activateRes = await activateRazorpayMonthlySubscription({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_subscription_id: response.razorpay_subscription_id,
          razorpay_signature: response.razorpay_signature,
        });
        if (!activateRes.ok) {
          setErrorMsg(activateRes.error);
          setBusy(false);
          return;
        }
        await refetch();
        setBusy(false);
        navigateHomeAfterPurchase();
      },
      modal: {
        ondismiss: () => setBusy(false),
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
                className="rounded-xl border border-kal-border bg-white px-4 py-3 text-kal-text"
              />
            </label>
          </div>

          {errorMsg ? (
            <p className="text-sm text-red-600" role="alert">
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
            {busy ? "Opening checkout…" : "Pay with Razorpay"}
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
