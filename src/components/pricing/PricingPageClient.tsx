"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Crown } from "lucide-react";

import {
  activateRazorpayMonthlySubscription,
  createRazorpayMonthlySubscription,
  ensureFreeTrialStarted,
} from "@/actions/subscription";
import { fetchDailyCapStatus } from "@/actions/dailyCap";
import type { DailyCapStatus } from "@/lib/daily-trial-cap";
import { CancelSubscriptionButton } from "@/components/subscription/CancelSubscriptionButton";
import { PaymentErrorMailButton } from "@/components/subscription/PaymentErrorMailButton";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import {
  AUTOPAY_MONTHS_MAX,
  AUTOPAY_MONTHS_MIN,
  clampAutopayMonths,
  DEFAULT_AUTOPAY_MONTHS,
} from "@/lib/autopayMonths";
import { SITE_NAME } from "@/lib/seo-metadata";
import { toUserFacingMessage } from "@/lib/userFacingErrors";
import { TIERS } from "@/lib/subscriptionTiers";
import type { PaymentErrorProof } from "@/lib/paymentSupportEmail";
import { useAuthStore } from "@/store/useAuthStore";

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const AUTOPAY_PRESET_MONTHS = [1, 2, 3, 6, 12] as const;

function AutopayDurationPanel({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (months: number) => void;
  disabled: boolean;
}) {
  const monthWord = value === 1 ? "month" : "months";

  return (
    <div className="mx-auto max-w-2xl space-y-2">
      <div className="kal-glass-panel relative overflow-hidden rounded-xl border border-kal-accent/25 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.22)] dark:border-kal-accent/20 dark:shadow-[0_20px_48px_-18px_rgba(0,0,0,0.45)]">
        <div
          className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-kal-accent/12 blur-2xl dark:bg-kal-accent/10"
          aria-hidden
        />
        <div className="relative p-3 sm:p-4">
          <div className="flex gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-kal-accent/15 text-kal-accent ring-1 ring-kal-accent/20 sm:h-10 sm:w-10">
              <CalendarClock className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-kal-accent">
                Smart Plan subscription
              </p>
              <h2 className="kal-section-heading mt-0.5">
                How long should AutoPay run?
              </h2>
              <p className="mt-1 text-xs leading-snug text-kal-text-secondary sm:mt-1.5">
                <span className="font-semibold text-kal-text">Monthly</span> billing at ₹399/month. Set how many
                monthly charges your UPI or card mandate may take. Cancel anytime
                &mdash; even before all months are used &mdash; and keep access for what you&apos;ve
                already paid.
              </p>
            </div>
          </div>

          <fieldset className="mt-3 space-y-2.5 sm:mt-3.5" disabled={disabled}>
            <legend className="sr-only">
              Number of months to authorize for AutoPay, from {AUTOPAY_MONTHS_MIN} to{" "}
              {AUTOPAY_MONTHS_MAX}
            </legend>

            <div>
              <p
                className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-kal-text-secondary"
                id="autopay-preset-legend"
              >
                Quick picks
              </p>
              <div
                className="kal-glass-subtle grid grid-cols-3 gap-1 rounded-xl border border-white/50 p-1 sm:grid-cols-6 dark:border-white/10"
                role="group"
                aria-labelledby="autopay-preset-legend"
              >
                {AUTOPAY_PRESET_MONTHS.map((m) => {
                  const selected = value === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange(m)}
                      className={`flex min-h-[40px] flex-col items-center justify-center rounded-lg px-0.5 py-1 text-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kal-accent sm:min-h-[44px] ${
                        selected
                          ? "bg-kal-accent text-kal-accent-foreground shadow-sm ring-1 ring-kal-accent/30"
                          : "text-kal-text-secondary hover:bg-kal-card-muted hover:text-kal-text"
                      }`}
                    >
                      <span className="text-base font-bold tabular-nums leading-none sm:text-lg">{m}</span>
                      <span className="mt-0.5 text-[0.6rem] font-semibold leading-none opacity-90">
                        {m === 1 ? "month" : "months"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label
                  htmlFor="autopay-months-range"
                  className="min-w-0 text-[0.7rem] font-semibold leading-tight text-kal-text-secondary sm:text-xs"
                >
                  Or drag ({AUTOPAY_MONTHS_MIN}–{AUTOPAY_MONTHS_MAX} months)
                </label>
                <span
                  className="flex shrink-0 items-baseline gap-1 tabular-nums"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="text-2xl font-bold leading-none text-kal-accent sm:text-3xl">
                    {value}
                  </span>
                  <span className="text-[0.65rem] font-medium capitalize text-kal-text-secondary">
                    {monthWord}
                  </span>
                </span>
              </div>
              <input
                id="autopay-months-range"
                type="range"
                min={AUTOPAY_MONTHS_MIN}
                max={AUTOPAY_MONTHS_MAX}
                step={1}
                value={value}
                onChange={(e) => onChange(clampAutopayMonths(e.target.value))}
                className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-kal-card-muted accent-kal-accent disabled:cursor-not-allowed disabled:opacity-50 sm:h-3"
              />
              <div className="mt-1 flex justify-between text-[0.6rem] font-medium tabular-nums text-kal-text-secondary/90">
                <span>{AUTOPAY_MONTHS_MIN}</span>
                <span aria-hidden>·</span>
                <span>{AUTOPAY_MONTHS_MAX}</span>
              </div>
            </div>

            <div className="flex gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-2.5 py-2 backdrop-blur-sm dark:border-emerald-500/20 dark:bg-emerald-500/[0.08]">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2.5}
                aria-hidden
              />
              <p className="text-[0.7rem] leading-snug text-kal-text sm:text-xs">
                <span className="font-semibold text-kal-text">Summary:</span>{" "}
                Up to{" "}
                <span className="font-bold text-kal-accent tabular-nums">{value}</span> monthly
                payment{value === 1 ? "" : "s"}, then stops unless you subscribe again.
              </p>
            </div>
          </fieldset>
        </div>
      </div>
      <p className="text-center text-[0.65rem] font-medium uppercase tracking-[0.12em] text-kal-text-secondary">
        Next — subscribe below
      </p>
    </div>
  );
}

const pro = TIERS.pro;

export function PricingPageClient() {
  const {
    hasPaidAccess,
    status: subscriptionStatus,
    plan,
    freeTrialActive,
    freeTrialVoiceSecondsRemaining,
    freeTrialEndsAtIso,
    welcomeTrialEligibleUnstarted,
    onboardingDone,
    refetch,
  } = useSubscriptionAccess();
  const isCancelledWithAccess =
    subscriptionStatus === "cancelled" && hasPaidAccess;
  const user = useAuthStore((s) => s.user);
  const userEmail = user?.email ?? null;
  const [billingCycle, setBillingCycle] = useState<"monthly" | "six_month" | "annual">("monthly");
  const [busy, setBusy] = useState(false);
  const [autopayMonths, setAutopayMonths] = useState(DEFAULT_AUTOPAY_MONTHS);
  const [checkoutError, setCheckoutError] = useState<{
    text: string;
    proof?: PaymentErrorProof;
    debugHint?: string;
  } | null>(null);
  const [welcomeFreeBusy, setWelcomeFreeBusy] = useState(false);
  const [capStatus, setCapStatus] = useState<DailyCapStatus | null>(null);
  const [queuedState, setQueuedState] = useState<{ queuedFor: string; resetsAt: string } | null>(null);

  // Fetch daily cap status on mount; refresh every 60 s.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchDailyCapStatus().then((s) => {
        if (!cancelled) setCapStatus(s);
      });
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const showWelcomeFreeCta =
    !!user?.id && onboardingDone && welcomeTrialEligibleUnstarted;

  const startWelcomeFreeTrial = useCallback(async () => {
    setWelcomeFreeBusy(true);
    setCheckoutError(null);
    try {
      const r = await ensureFreeTrialStarted();
      if (!r.ok) {
        if (r.error === "daily_cap_reached") {
          const capResult = r as { ok: false; error: "daily_cap_reached"; queued: boolean; queuedFor: string; resetsAt: string };
          // Refresh cap status so UI switches to State C without full page reload.
          void fetchDailyCapStatus().then(setCapStatus);
          if (capResult.queued) {
            setQueuedState({ queuedFor: capResult.queuedFor, resetsAt: capResult.resetsAt });
          } else {
            setCheckoutError({
              text: "Today's free spots are full. New spots open at midnight IST.",
            });
          }
          return;
        }
        setCheckoutError({ text: r.error });
        return;
      }
      if (r.started) refetch();
      window.location.assign("/home");
    } catch (error) {
      setCheckoutError({
        text: toUserFacingMessage(error),
      });
    } finally {
      setWelcomeFreeBusy(false);
    }
  }, [refetch]);

  const showCancel =
    subscriptionStatus === "trial" || subscriptionStatus === "active";

  const startCheckout = useCallback(async () => {
    setBusy(true);
    setCheckoutError(null);
    try {
      const created = await createRazorpayMonthlySubscription("pro", autopayMonths);
      if (!created.ok) {
        setCheckoutError({
          text: created.error,
          debugHint: created.debugHint,
        });
        return;
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        setCheckoutError({
          text: "Unable to load payment window. Refresh and try again.",
        });
        return;
      }

      const description = `${pro.name} (${pro.monthlyPriceDisplay}/mo) · AutoPay up to ${autopayMonths} monthly charge${autopayMonths === 1 ? "" : "s"}`;
      const rzp = new window.Razorpay({
        key: created.keyId,
        name: SITE_NAME,
        description,
        subscription_id: created.subscriptionId,
        amount: created.amountPaise,
        currency: "INR",
        theme: { color: "#FF7A00" },
        prefill: created.prefill,
        ...(created.prefill.contact
          ? { readonly: { email: true, contact: true } }
          : { readonly: { email: true } }),
        handler: async (response: RazorpayCheckoutResponse) => {
          const updated = await activateRazorpayMonthlySubscription({ ...response });
          if (!updated.ok) {
            setCheckoutError({
              text: updated.error,
              proof: {
                paymentId: response.razorpay_payment_id,
                subscriptionId: response.razorpay_subscription_id,
              },
            });
            return;
          }
          window.location.assign("/home");
        },
      });
      rzp.open();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[pricing] startCheckout failed", error);
      }
      setCheckoutError({
        text: toUserFacingMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }, [autopayMonths]);

  const startAnnualCheckout = useCallback(async () => {
    setBusy(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/annual-plan", { method: "POST" });
      const created = (await res.json()) as {
        ok: boolean;
        error?: string;
        keyId?: string;
        orderId?: string;
        amountPaise?: number;
        prefill?: { name: string; email: string };
      };
      if (!created.ok) {
        setCheckoutError({ text: created.error ?? "Could not create annual order." });
        return;
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        setCheckoutError({ text: "Unable to load payment window. Refresh and try again." });
        return;
      }

      const rzp = new window.Razorpay({
        key: created.keyId,
        name: SITE_NAME,
        description: `Smart Plan Annual · ₹3,830/year`,
        order_id: created.orderId,
        amount: created.amountPaise,
        currency: "INR",
        theme: { color: "#FF7A00" },
        prefill: created.prefill,
        ...(created.prefill?.email
          ? { readonly: { email: true } }
          : {}),
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verified = await fetch("/api/annual-plan/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const result = (await verified.json()) as { ok: boolean; error?: string };
          if (!result.ok) {
            setCheckoutError({ text: result.error ?? "Payment verification failed. Contact support." });
            return;
          }
          window.location.assign("/home");
        },
      });
      rzp.open();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[pricing] startAnnualCheckout failed", error);
      }
      setCheckoutError({ text: toUserFacingMessage(error) });
    } finally {
      setBusy(false);
    }
  }, []);

  const startSixMonthCheckout = useCallback(async () => {
    setBusy(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/six-month-plan", { method: "POST" });
      const created = (await res.json()) as {
        ok: boolean;
        error?: string;
        keyId?: string;
        orderId?: string;
        amountPaise?: number;
        prefill?: { name: string; email: string };
      };
      if (!created.ok) {
        setCheckoutError({ text: created.error ?? "Could not create 6-month order." });
        return;
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        setCheckoutError({ text: "Unable to load payment window. Refresh and try again." });
        return;
      }

      const rzp = new window.Razorpay({
        key: created.keyId,
        name: SITE_NAME,
        description: `Smart Plan 6 Months · ₹2,154`,
        order_id: created.orderId,
        amount: created.amountPaise,
        currency: "INR",
        theme: { color: "#FF7A00" },
        prefill: created.prefill,
        ...(created.prefill?.email
          ? { readonly: { email: true } }
          : {}),
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verified = await fetch("/api/six-month-plan/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const result = (await verified.json()) as { ok: boolean; error?: string };
          if (!result.ok) {
            setCheckoutError({ text: result.error ?? "Payment verification failed. Contact support." });
            return;
          }
          window.location.assign("/home");
        },
      });
      rzp.open();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[pricing] startSixMonthCheckout failed", error);
      }
      setCheckoutError({ text: toUserFacingMessage(error) });
    } finally {
      setBusy(false);
    }
  }, []);

  const statusBanner = useMemo(() => {
    if (freeTrialActive && !hasPaidAccess) {
      const voiceMinLeft = Math.floor(freeTrialVoiceSecondsRemaining / 60);
      const voiceSecLeft = freeTrialVoiceSecondsRemaining % 60;
      const voiceStr =
        voiceMinLeft > 0
          ? `${voiceMinLeft}m ${voiceSecLeft > 0 ? `${voiceSecLeft}s` : ""}`.trim()
          : `${freeTrialVoiceSecondsRemaining}s`;
      return (
        <div className="rounded-2xl border border-kal-accent/35 bg-gradient-to-br from-kal-accent/12 to-kal-card-muted px-5 py-4 shadow-sm dark:border-kal-accent/25">
          <p className="text-sm font-semibold text-kal-text">Your 3-day free trial is active</p>
          <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
            You have <span className="font-semibold text-kal-text">{voiceStr} of voice time</span> remaining
            {freeTrialEndsAtIso ? (
              <>
                {" "}(trial ends{" "}
                {new Date(freeTrialEndsAtIso).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                )
              </>
            ) : null}
            . Subscribe to Smart Plan below to continue after your trial — 2M tokens and 100 minutes of voice every month.
          </p>
        </div>
      );
    }
    if (isCancelledWithAccess) {
      return (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 backdrop-blur-sm dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Your subscription is cancelled — your access continues until it expires. You can
            subscribe again below.
          </p>
        </div>
      );
    }
    if (hasPaidAccess && !isCancelledWithAccess) {
      if (billingCycle === "annual" && plan !== "annual") {
        return (
          <div className="rounded-2xl border border-kal-accent/30 bg-kal-accent-soft/50 px-5 py-4 dark:border-kal-accent/25 dark:bg-kal-accent/10">
            <p className="text-sm font-medium text-kal-accent-dark dark:text-kal-accent">
              Upgrading to Annual will cancel your monthly plan and give you 12 months of access for ₹3,830 — no further monthly charges.
            </p>
          </div>
        );
      }
      if (billingCycle === "six_month" && plan !== "six_month" && plan !== "annual") {
        return (
          <div className="rounded-2xl border border-kal-accent/30 bg-kal-accent-soft/50 px-5 py-4 dark:border-kal-accent/25 dark:bg-kal-accent/10">
            <p className="text-sm font-medium text-kal-accent-dark dark:text-kal-accent">
              Upgrading to 6 Months will cancel your monthly plan and give you 6 months of access for ₹2,154 — no further monthly charges.
            </p>
          </div>
        );
      }
      return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 backdrop-blur-sm dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            You already have Smart Plan access.{" "}
            <Link href="/my-subscription" className="font-bold underline underline-offset-2">
              My Subscription
            </Link>{" "}
            has billing details and extra credits.
          </p>
        </div>
      );
    }
    if (subscriptionStatus === "expired") {
      return (
        <div className="rounded-2xl border border-kal-accent/30 bg-kal-accent-soft/50 px-5 py-4 dark:border-kal-accent/25 dark:bg-kal-accent/10">
          <p className="text-sm font-medium text-kal-accent-dark dark:text-kal-accent">
            Your last payment could not be processed. Subscribe again to continue using {SITE_NAME}.
          </p>
        </div>
      );
    }
    if (subscriptionStatus === "cancelled" && !hasPaidAccess) {
      return (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 backdrop-blur-sm dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Your subscription has been cancelled and access has ended. Subscribe to Smart Plan below to
            continue.
          </p>
        </div>
      );
    }
    return null;
  }, [
    subscriptionStatus,
    hasPaidAccess,
    isCancelledWithAccess,
    plan,
    billingCycle,
    freeTrialActive,
    freeTrialVoiceSecondsRemaining,
    freeTrialEndsAtIso,
  ]);

  const isUpgradeFromMonthly =
    hasPaidAccess &&
    !isCancelledWithAccess &&
    ((billingCycle === "annual" && plan !== "annual") ||
      (billingCycle === "six_month" && plan !== "six_month" && plan !== "annual"));
  const lockedBySubscription = hasPaidAccess && !isCancelledWithAccess && !isUpgradeFromMonthly;
  const isActiveProSubscription =
    hasPaidAccess &&
    (subscriptionStatus === "trial" || subscriptionStatus === "active");

  let buttonLabel: string;
  if (isUpgradeFromMonthly) {
    if (busy) {
      buttonLabel = "Opening checkout...";
    } else if (billingCycle === "annual") {
      buttonLabel = "Upgrade to Annual — ₹3,830/year";
    } else {
      buttonLabel = "Upgrade to 6 Months — ₹2,154";
    }
  } else if (isActiveProSubscription) {
    buttonLabel = "Current plan";
  } else if (isCancelledWithAccess) {
    if (billingCycle === "annual") {
      buttonLabel = "Resubscribe — ₹3,830/year";
    } else if (billingCycle === "six_month") {
      buttonLabel = "Resubscribe — ₹2,154/6 months";
    } else {
      buttonLabel = `Resubscribe — ${pro.monthlyPriceDisplay}/month`;
    }
  } else if (hasPaidAccess) {
    buttonLabel = "Manage in app";
  } else if (busy) {
    buttonLabel = "Opening checkout...";
  } else {
    if (billingCycle === "annual") {
      buttonLabel = "Subscribe — ₹3,830/year";
    } else if (billingCycle === "six_month") {
      buttonLabel = "Subscribe — ₹2,154/6 months";
    } else {
      buttonLabel = `Subscribe — ${pro.monthlyPriceDisplay}/month`;
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <section className="mx-auto max-w-5xl space-y-8 pb-10">
        {/* Start free trial CTA — four states: queued / cap full / spots available / cap off */}
        {showWelcomeFreeCta ? (
          queuedState ? (
            /* ── State D: user was just queued for tomorrow ──────────────────── */
            <div className="kal-glass-panel rounded-2xl border-2 border-kal-accent/40 bg-kal-accent/[0.05] px-5 py-5 text-center">
              <p className="text-sm font-semibold text-kal-text">
                You&rsquo;re on tomorrow&rsquo;s list.
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-kal-text-secondary">
                Your free trial will auto-activate at midnight IST. We&rsquo;ll email you when it&rsquo;s ready.
              </p>
              <p className="mt-2 text-[11px] text-kal-text-secondary">
                Spot reserved for{" "}
                <span className="font-semibold text-kal-text">
                  {new Date(queuedState.queuedFor + "T00:00:00+05:30").toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "Asia/Kolkata",
                  })}
                </span>
              </p>
              <div className="my-4 flex items-center gap-3 text-xs text-kal-text-secondary">
                <span className="h-px flex-1 bg-kal-border/40" />
                <span>or skip the wait</span>
                <span className="h-px flex-1 bg-kal-border/40" />
              </div>
              <Link
                href="/waitlist/position"
                className="kal-btn-accent inline-flex min-h-[48px] w-full max-w-md items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition hover:brightness-105 sm:w-auto"
              >
                Start right now for ₹19 →
              </Link>
              <p className="mt-2 text-[11px] text-kal-text-secondary">
                Same 3 days. Instant access.
              </p>
            </div>
          ) : capStatus?.capEnabled && capStatus.isFull ? (
            /* ── State C: cap full ───────────────────────────────────────────── */
            <div className="kal-glass-panel rounded-2xl border-2 border-kal-border/60 bg-kal-card-muted/60 px-5 py-5 text-center">
              {/* Primary outline button first */}
              <button
                type="button"
                disabled
                className="inline-flex min-h-[48px] w-full max-w-md items-center justify-center rounded-xl border-2 border-kal-accent px-6 py-3 text-sm font-bold text-kal-accent opacity-80 sm:w-auto"
              >
                Join tomorrow&rsquo;s waitlist →
              </button>
              {/* Text below primary button */}
              <p className="mt-3 text-sm font-semibold text-kal-text">
                Today&rsquo;s {capStatus.dailyCap.toLocaleString("en-IN")} free spots are full.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-kal-text-secondary">
                New spots open at midnight — in{" "}
                <span className="font-semibold text-kal-text">
                  {Math.floor(capStatus.hoursUntilReset)} hours
                </span>
                .
              </p>
              {/* Secondary filled-orange skip CTA */}
              <div className="mt-4">
                <Link
                  href="/waitlist/position"
                  className="kal-btn-accent inline-flex min-h-[48px] w-full max-w-md items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition hover:brightness-105 sm:w-auto"
                >
                  Don&rsquo;t want to wait? Start now for ₹19 →
                </Link>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-kal-text-secondary">
                Your spot is yours the moment you pay ₹19.{" "}
                Tomorrow&rsquo;s free spots open at midnight IST.
              </p>
            </div>
          ) : (
            /* ── State A / B: cap off or spots available ─────────────────────── */
            <div className="kal-glass-panel rounded-2xl border-2 border-emerald-500/35 bg-emerald-500/[0.06] px-5 py-5 text-center dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]">
              <p className="text-sm font-semibold text-kal-text">
                Start your 3-day free trial — every feature, no card required.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-kal-text-secondary">
                Your trial timer starts only after you tap this button.
              </p>
              <button
                type="button"
                onClick={() => {
                  void startWelcomeFreeTrial();
                }}
                disabled={welcomeFreeBusy || busy}
                className="kal-btn-accent mt-4 inline-flex min-h-[48px] w-full max-w-md items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition disabled:opacity-60 sm:w-auto"
              >
                {welcomeFreeBusy ? "Starting…" : "Start free — 3 days on us →"}
              </button>
              {/* State B: spot counter when cap is enabled and spots remain */}
              {capStatus?.capEnabled && !capStatus.isFull ? (
                <div className="mt-3">
                  <div className="mx-auto max-w-xs overflow-hidden rounded-full bg-kal-border/30 h-1">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        capStatus.spotsRemaining < 100
                          ? "bg-orange-500"
                          : capStatus.trialsStartedToday / capStatus.dailyCap >= 0.8
                          ? "bg-orange-400"
                          : capStatus.trialsStartedToday / capStatus.dailyCap >= 0.5
                          ? "bg-amber-400"
                          : "bg-kal-border/60"
                      }`}
                      style={{
                        width: `${Math.min(100, (capStatus.trialsStartedToday / capStatus.dailyCap) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-kal-text-secondary">
                    {capStatus.spotsRemaining < 100
                      ? "Fewer than 100 spots remaining today"
                      : `${capStatus.spotsRemaining.toLocaleString("en-IN")} of ${capStatus.dailyCap.toLocaleString("en-IN")} spots left today`}
                  </p>
                </div>
              ) : null}
            </div>
          )
        ) : null}

        <header className="kal-glass-panel rounded-2xl px-6 py-8 text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-kal-accent">
            Kalnehi Smart Plan
          </p>
          <h1 className="kal-feature-title mt-3">
            One plan. Everything included.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-kal-text-secondary">
            <span className="font-semibold text-kal-text">3-day free trial:</span> all features, 60,000 PrepBrain tokens, 12 minutes voice — no card needed.{" "}
            <span className="font-semibold text-kal-text">
              Smart Plan ({pro.monthlyPriceDisplay}/month):
            </span>{" "}
            2 million tokens and 100 minutes of voice per month, with AutoPay for the duration you choose.
          </p>

          {/* Billing cycle toggle */}
          <div className="mx-auto mt-5 inline-flex rounded-full border border-kal-border bg-kal-card-muted p-1 gap-1">
            <button
              type="button"
              aria-pressed={billingCycle === "monthly"}
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-kal-card text-kal-text shadow-sm"
                  : "text-kal-text-secondary hover:text-kal-text"
              }`}
            >
              Monthly · ₹399/mo
            </button>
            <button
              type="button"
              aria-pressed={billingCycle === "six_month"}
              onClick={() => setBillingCycle("six_month")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                billingCycle === "six_month"
                  ? "bg-kal-accent text-white shadow-sm"
                  : "text-kal-text-secondary hover:text-kal-text"
              }`}
            >
              6 Months · ₹359/mo
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none ${
                billingCycle === "six_month" ? "bg-white/25 text-white" : "bg-kal-accent/15 text-kal-accent"
              }`}>
                Save 10%
              </span>
            </button>
            <button
              type="button"
              aria-pressed={billingCycle === "annual"}
              onClick={() => setBillingCycle("annual")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                billingCycle === "annual"
                  ? "bg-kal-accent text-white shadow-sm"
                  : "text-kal-text-secondary hover:text-kal-text"
              }`}
            >
              Annual · ₹319/mo
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none ${
                billingCycle === "annual" ? "bg-white/25 text-white" : "bg-kal-accent/15 text-kal-accent"
              }`}>
                Save 20%
              </span>
            </button>
          </div>
          <div className="kal-glass-panel mx-auto mt-6 max-w-xl rounded-2xl border-2 border-kal-accent/40 px-4 py-4 shadow-[0_16px_40px_-24px_rgba(255,122,0,0.25)] sm:px-5">
            <p className="text-sm font-semibold text-kal-text">New here? Take the feature tour first.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/what-can-kalnehi-do"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-kal-accent px-4 py-2.5 text-center text-sm font-bold text-kal-accent-foreground transition hover:brightness-105 active:scale-[0.99]"
              >
                What Can Kalnehi Do?
              </Link>
              <Link
                href="/best-study-practices"
                className="kal-btn-ghost inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition"
              >
                Why these practices work
              </Link>
            </div>
          </div>
        </header>

        {statusBanner}

        {(!hasPaidAccess || isCancelledWithAccess || isUpgradeFromMonthly) && billingCycle === "monthly" ? (
          <AutopayDurationPanel
            value={autopayMonths}
            onChange={setAutopayMonths}
            disabled={busy}
          />
        ) : null}

        <div className="mx-auto max-w-lg">
          <article className="kal-glass-panel relative flex min-h-0 flex-col rounded-2xl border-2 border-kal-accent/50 p-5 pb-6 ring-2 ring-kal-accent/30">
            <span className="absolute -top-3 left-4 rounded-full bg-kal-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-kal-accent-foreground">
              Smart Plan
            </span>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-kal-accent">
                <Crown className="h-5 w-5" />
              </span>
              <h2 className="kal-section-heading">{pro.name}</h2>
            </div>
            <p className="mt-1 text-xs text-kal-text-secondary">{pro.tagline}</p>

            <div className="mt-4 rounded-xl border border-kal-accent/40 bg-kal-accent/10 px-3 py-3">
              {billingCycle === "annual" ? (
                <>
                  <p className="text-lg font-bold leading-snug text-kal-text">
                    ₹3,830/year
                    <span className="ml-2 text-xs font-semibold text-kal-accent">₹319/mo · Save 20%</span>
                  </p>
                  <p className="mt-1 text-xs font-medium leading-snug text-kal-text-secondary">
                    One-time payment · 12 months access · no recurring charge.
                  </p>
                </>
              ) : billingCycle === "six_month" ? (
                <>
                  <p className="text-lg font-bold leading-snug text-kal-text">
                    ₹2,154/6 months
                    <span className="ml-2 text-xs font-semibold text-kal-accent">₹359/mo · Save 10%</span>
                  </p>
                  <p className="mt-1 text-xs font-medium leading-snug text-kal-text-secondary">
                    One-time payment · 6 months access · no recurring charge.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold leading-snug text-kal-text">
                    {pro.monthlyPriceDisplay}/month
                  </p>
                  <p className="mt-1 text-xs font-medium leading-snug text-kal-text-secondary">
                    AutoPay for the duration you choose above. Cancel anytime.
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col">
              <ul className="space-y-2">
                {pro.benefits.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-xs leading-snug text-kal-text-secondary sm:text-sm"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                if (lockedBySubscription) return;
                if (billingCycle === "annual") {
                  void startAnnualCheckout();
                } else if (billingCycle === "six_month") {
                  void startSixMonthCheckout();
                } else {
                  void startCheckout();
                }
              }}
              disabled={busy || lockedBySubscription}
              aria-disabled={lockedBySubscription || undefined}
              className={`mt-5 min-h-[48px] w-full shrink-0 text-center leading-snug disabled:opacity-60 ${
                lockedBySubscription
                  ? "kal-btn-accent inline-flex cursor-default items-center justify-center whitespace-normal px-5 py-3 text-sm opacity-80"
                  : "kal-btn-accent inline-flex items-center justify-center whitespace-normal px-5 py-3 text-sm transition"
              }`}
            >
              {buttonLabel}
            </button>
          </article>
        </div>

        {showCancel ? (
          <div className="mx-auto max-w-sm">
            <CancelSubscriptionButton />
          </div>
        ) : null}

        {checkoutError ? (
          <div className="kal-glass-subtle rounded-xl border border-kal-accent/25 bg-kal-accent-soft px-4 py-3 text-center dark:border-kal-accent/20 dark:bg-kal-accent/[0.08]">
            <p className="text-sm text-kal-accent-dark dark:text-kal-accent" role="status">
              {checkoutError.text}
            </p>
            {!user?.id ? (
              <div className="mt-2 flex justify-center">
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-kal-accent px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-105"
                >
                  Sign in →
                </Link>
              </div>
            ) : null}
            {checkoutError.debugHint ? (
              <p className="mt-2 text-left text-xs leading-snug text-kal-accent-dark/90 dark:text-kal-accent/90">
                {checkoutError.debugHint}
              </p>
            ) : null}
            <div className="mt-1 flex justify-center">
              <PaymentErrorMailButton
                flow="Pricing — checkout"
                error={checkoutError.text}
                userEmail={userEmail}
                proof={checkoutError.proof}
                className="inline-flex items-center gap-1.5 rounded-lg border border-kal-accent/30 bg-kal-accent-soft px-3 py-1.5 text-xs font-semibold text-kal-accent-dark underline-offset-2 hover:underline dark:border-kal-accent/25 dark:bg-kal-accent/10 dark:text-kal-accent"
              />
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
