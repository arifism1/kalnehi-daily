"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, ShieldCheck } from "lucide-react";

import {
  activateRazorpayMonthlySubscription,
  createRazorpayMonthlySubscription,
} from "@/actions/subscription";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAuthStore } from "@/store/useAuthStore";
import {
  AUTOPAY_MONTHS_MAX,
  AUTOPAY_MONTHS_MIN,
  clampAutopayMonths,
  DEFAULT_AUTOPAY_MONTHS,
} from "@/lib/autopayMonths";

const AUTOPAY_PRESET_MONTHS = [1, 2, 3, 6, 12] as const;
const SKIP_PRICE_PAISE = 1900;

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayOrderResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type DataSummary = {
  streakDays: number;
  syllabusPercent: number;
  doubtsLogged: number;
  prepbrainConversations: number;
};

function useTrialDataSummary(): DataSummary {
  // In a real implementation these would be pulled from Supabase.
  // For now return minimal cached data from subscription context.
  return { streakDays: 0, syllabusPercent: 0, doubtsLogged: 0, prepbrainConversations: 0 };
}

export function Day3Paywall() {
  const { welcomeTrialExpiredNoPay, hasHadTrial, refetch, loading } = useSubscriptionAccess();
  const user = useAuthStore((s) => s.user);
  const [months, setMonths] = useState(DEFAULT_AUTOPAY_MONTHS);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [skipBusy, setSkipBusy] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const dataSummary = useTrialDataSummary();

  const showSkipOption = !hasHadTrial;

  const visible = !loading && welcomeTrialExpiredNoPay;

  const handleSubscribe = useCallback(async () => {
    if (!window.Razorpay) return;
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
      description: `Smart Plan · ${months} month${months === 1 ? "" : "s"}`,
      prefill: { email: user?.email ?? "" },
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
        refetch();
        setBusy(false);
      },
      modal: {
        ondismiss: () => setBusy(false),
      },
    });
    rzp.open();
  }, [months, user, refetch]);

  const handleSkip = useCallback(async () => {
    if (!window.Razorpay) return;
    setSkipBusy(true);
    setSkipError(null);

    try {
      const res = await fetch("/api/waitlist/skip", { method: "POST" });
      const data = await res.json() as {
        ok: boolean; error?: string; keyId?: string; orderId?: string;
        amountPaise?: number; prefill?: Record<string, string>;
      };
      if (!data.ok) {
        setSkipError(data.error ?? "Failed to initiate payment.");
        setSkipBusy(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amountPaise,
        currency: "INR",
        name: "Kalnehi Daily",
        description: "Skip the waitlist — ₹19",
        prefill: data.prefill ?? {},
        handler: async (response: RazorpayOrderResponse) => {
          setSkipBusy(true);
          const verifyRes = await fetch("/api/waitlist/skip/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyData = await verifyRes.json() as { ok: boolean; error?: string };
          if (!verifyData.ok) {
            setSkipError(verifyData.error ?? "Verification failed.");
            setSkipBusy(false);
            return;
          }
          refetch();
          setSkipBusy(false);
        },
        modal: { ondismiss: () => setSkipBusy(false) },
      });
      rzp.open();
    } catch {
      setSkipError("Something went wrong. Please try again.");
      setSkipBusy(false);
    }
  }, [refetch]);

  if (!visible) return null;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Full-screen overlay */}
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day3-paywall-title"
      >
        <div className="kal-glass-panel flex min-h-0 w-full max-w-lg max-h-[92dvh] flex-col overflow-hidden rounded-2xl border border-kal-border shadow-[0_24px_80px_-16px_rgba(0,0,0,0.45)]">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-6 sm:p-8 [-webkit-overflow-scrolling:touch]">

            {/* Header */}
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-kal-accent mb-1">
                Trial ended
              </p>
              <h1
                id="day3-paywall-title"
                className="text-2xl font-normal leading-tight text-kal-text sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Your 3-day trial has ended.
              </h1>
              <p className="mt-2 text-sm text-kal-text-secondary">
                Your streak is paused. Your data is safe.
              </p>
            </div>

            {/* Preserved data summary */}
            <div className="mb-6 rounded-xl border border-kal-border bg-kal-card/40 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-kal-muted">
                Still waiting for you
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Streak", value: `${dataSummary.streakDays} days` },
                  { label: "Syllabus", value: `${dataSummary.syllabusPercent}% done` },
                  { label: "Doubts logged", value: String(dataSummary.doubtsLogged) },
                  { label: "AI conversations", value: String(dataSummary.prepbrainConversations) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kal-accent/70" aria-hidden />
                    <span className="text-xs text-kal-text-secondary">
                      <span className="font-medium text-kal-text">{label}:</span>{" "}
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Plan card with autopay picker */}
            <div className="mb-1">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-kal-text-secondary">
                    Smart Plan
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-normal text-kal-text"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      ₹499
                    </span>
                    <span className="text-xs text-kal-muted">/month</span>
                  </div>
                </div>
                <span className="rounded-full bg-kal-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most popular
                </span>
              </div>

              {/* AutoPay months picker */}
              <div className="mb-3">
                <p className="mb-2 text-xs font-semibold text-kal-text-secondary">
                  AutoPay duration
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {AUTOPAY_PRESET_MONTHS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={months === m}
                      onClick={() => setMonths(m)}
                      disabled={busy}
                      className={`rounded-lg py-2 text-center text-sm font-bold transition-all ${
                        months === m
                          ? "bg-kal-accent text-white shadow-sm"
                          : "bg-kal-card-muted text-kal-text-secondary hover:bg-kal-card hover:text-kal-text"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-kal-muted/80 px-1">
                  <span>1 month</span>
                  <span>12 months</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-kal-accent/[0.08] px-2.5 py-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-kal-accent" strokeWidth={2.5} />
                  <p className="text-xs text-kal-text">
                    Up to <span className="font-bold text-kal-accent">{months}</span> monthly
                    payment{months === 1 ? "" : "s"}, then stops.
                  </p>
                </div>
              </div>

              {/* Primary CTA */}
              {errorMsg && (
                <p className="mb-2 text-xs text-red-500">{errorMsg}</p>
              )}
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={busy}
                className="w-full min-h-[52px] rounded-full bg-kal-accent px-6 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.32)] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? "Processing…" : `Continue with Smart Plan →`}
              </button>
            </div>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-kal-border" />
              <span className="text-xs text-kal-muted">or</span>
              <div className="h-px flex-1 bg-kal-border" />
            </div>

            {/* ₹19 rescue option (only if not already had trial) */}
            {showSkipOption && (
              <div className="text-center">
                <p className="mb-2 text-sm text-kal-text-secondary">Not ready for full commitment?</p>
                {skipError && (
                  <p className="mb-2 text-xs text-red-500">{skipError}</p>
                )}
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={skipBusy}
                  className="text-sm font-semibold text-kal-accent hover:underline disabled:opacity-60"
                >
                  {skipBusy ? "Processing…" : "Try 3 more days for ₹19 →"}
                </button>
              </div>
            )}

            {/* Footer note */}
            <p className="mt-6 text-center text-xs text-kal-muted">
              Cancel anytime from Settings. Your data never expires.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
