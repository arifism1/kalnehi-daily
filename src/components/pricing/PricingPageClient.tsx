"use client";

import Link from "next/link";
import Script from "next/script";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { CalendarClock, Check, Crown } from "lucide-react";

import {
  activateRazorpaySubscription,
  activateRazorpayMonthlySubscription,
  createRazorpayTrialSubscription,
  createRazorpayMonthlySubscription,
} from "@/actions/subscription";
import { CancelSubscriptionButton } from "@/components/subscription/CancelSubscriptionButton";
import { PaymentErrorMailButton } from "@/components/subscription/PaymentErrorMailButton";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import {
  AUTOPAY_MONTHS_MAX,
  AUTOPAY_MONTHS_MIN,
  clampAutopayMonths,
  DEFAULT_AUTOPAY_MONTHS,
} from "@/lib/autopayMonths";
import { formatWelcomeVoiceTimeLeft } from "@/lib/freeTrial";
import { SITE_NAME } from "@/lib/seo-metadata";
import { toUserFacingMessage } from "@/lib/userFacingErrors";
import { TIERS } from "@/lib/subscriptionTiers";
import { isHelpyJiEligibleForPricingPage } from "@/lib/helpyjiVisibility";
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

const HelpyJiChat = dynamic(
  () =>
    import("@/components/helpyji/HelpyJiChat").then((m) => ({
      default: m.HelpyJiChat,
    })),
  { ssr: false },
);

const AUTOPAY_PRESET_MONTHS = [1, 2, 3, 6, 12] as const;

function AutopayDurationPanel({
  value,
  onChange,
  disabled,
  hasHadTrial,
}: {
  value: number;
  onChange: (months: number) => void;
  disabled: boolean;
  hasHadTrial: boolean;
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
                Pro subscription
              </p>
              <h2 className="mt-0.5 text-base font-bold leading-tight tracking-tight text-kal-text sm:text-lg">
                How long should AutoPay run?
              </h2>
              <p className="mt-1 text-xs leading-snug text-kal-text-secondary sm:mt-1.5">
                <span className="font-semibold text-kal-text">Monthly</span> billing: set how many
                post-trial monthly charges your UPI or card mandate may take. You can cancel anytime
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
                {hasHadTrial ? (
                  <>
                    Up to{" "}
                    <span className="font-bold text-kal-accent tabular-nums">{value}</span> monthly
                    payment{value === 1 ? "" : "s"}, then stops unless you subscribe again.
                  </>
                ) : (
                  <>
                    After trial, up to{" "}
                    <span className="font-bold text-kal-accent tabular-nums">{value}</span> monthly
                    payment{value === 1 ? "" : "s"}, then stops unless you subscribe again.
                  </>
                )}
              </p>
            </div>
          </fieldset>
        </div>
      </div>
      <p className="text-center text-[0.65rem] font-medium uppercase tracking-[0.12em] text-kal-text-secondary">
        Next — subscribe to Pro below
      </p>
    </div>
  );
}

const pro = TIERS.pro;

export function PricingPageClient() {
  const {
    hasPaidAccess,
    hasHadTrial,
    status: subscriptionStatus,
    freeTrialActive,
    freeTrialVoiceSecondsRemaining,
    freeTrialEndsAtIso,
  } = useSubscriptionAccess();
  const isCancelledWithAccess =
    subscriptionStatus === "cancelled" && hasPaidAccess;
  const user = useAuthStore((s) => s.user);
  const userEmail = user?.email ?? null;
  const [busy, setBusy] = useState(false);
  const [autopayMonths, setAutopayMonths] = useState(DEFAULT_AUTOPAY_MONTHS);
  const [checkoutError, setCheckoutError] = useState<{
    text: string;
    proof?: PaymentErrorProof;
    debugHint?: string;
  } | null>(null);
  const helpyjiAnchorRef = useRef<HTMLDivElement>(null);

  const showCancel =
    subscriptionStatus === "trial" || subscriptionStatus === "active";

  const startCheckout = useCallback(async () => {
    setBusy(true);
    setCheckoutError(null);
    try {
      const created = hasHadTrial
        ? await createRazorpayMonthlySubscription("pro", autopayMonths)
        : await createRazorpayTrialSubscription("pro", autopayMonths);
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

      const description = hasHadTrial
        ? `${pro.name} (${pro.monthlyPriceDisplay}/mo) · AutoPay up to ${autopayMonths} monthly charge${autopayMonths === 1 ? "" : "s"}`
        : `${pro.name} 2-day trial (${pro.trialPriceDisplay}) · then ${pro.monthlyPriceDisplay}/mo · AutoPay up to ${autopayMonths} monthly charge${autopayMonths === 1 ? "" : "s"}`;
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
          const updated = hasHadTrial
            ? await activateRazorpayMonthlySubscription({ ...response })
            : await activateRazorpaySubscription({ ...response });
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
          window.location.assign("/");
        },
      });
      rzp.open();
    } catch (error) {
      setCheckoutError({
        text: toUserFacingMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }, [autopayMonths, hasHadTrial]);

  const statusBanner = useMemo(() => {
    if (freeTrialActive && !hasPaidAccess) {
      return (
        <div className="rounded-2xl border border-kal-accent/35 bg-gradient-to-br from-kal-accent/12 to-kal-card-muted px-5 py-4 shadow-sm dark:border-kal-accent/25">
          <p className="text-sm font-semibold text-kal-text">1-day free trial is active</p>
          <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
            You have{" "}
            <span className="font-semibold text-kal-text">
              {formatWelcomeVoiceTimeLeft(freeTrialVoiceSecondsRemaining)}
            </span>{" "}
            of welcome voice time
            {freeTrialEndsAtIso ? (
              <>
                {" "}
                (ends{" "}
                {new Date(freeTrialEndsAtIso).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                )
              </>
            ) : null}
            . Then start the 2-day paid trial (₹19), then ₹299/month AutoPay — cancel anytime.
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
    if (hasPaidAccess) {
      const trialHint =
        subscriptionStatus === "trial"
          ? " During your 2-day paid trial you have 15 voice minutes and 5,00,000 (5 lakh) PrepBrain tokens. After the first successful charge you get 60 voice minutes and 2,000,000 (2 million) tokens per month."
          : "";
      return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 backdrop-blur-sm dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            You already have Pro access.{trialHint}{" "}
            <Link href="/my-plan" className="font-bold underline underline-offset-2">
              My Plan
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
            Your subscription has been cancelled and access has ended. Subscribe to Pro below to
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
    freeTrialActive,
    freeTrialVoiceSecondsRemaining,
    freeTrialEndsAtIso,
  ]);

  const lockedBySubscription = hasPaidAccess && !isCancelledWithAccess;
  const isActiveProSubscription =
    hasPaidAccess &&
    (subscriptionStatus === "trial" || subscriptionStatus === "active");

  let buttonLabel: string;
  if (isActiveProSubscription) {
    buttonLabel = "Current plan";
  } else if (isCancelledWithAccess) {
    buttonLabel = hasHadTrial
      ? `Resubscribe — ${pro.monthlyPriceDisplay}/month`
      : `Resubscribe — ${pro.trialPriceDisplay} trial`;
  } else if (hasPaidAccess) {
    buttonLabel = "Manage in app";
  } else if (busy) {
    buttonLabel = "Opening checkout...";
  } else if (hasHadTrial) {
    buttonLabel = `Subscribe — ${pro.monthlyPriceDisplay}/month`;
  } else {
    buttonLabel = `Start 2-day trial — ${pro.trialPriceDisplay}`;
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <section className="mx-auto max-w-5xl space-y-8 pb-10">
        <header className="kal-glass-panel rounded-2xl px-6 py-8 text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-kal-accent">
            Kalnehi Pro
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-kal-text">
            One simple plan for full prep
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-kal-text-secondary">
            <span className="font-semibold text-kal-text">Step 1 — 1-day free trial:</span> 5 voice
            minutes + 300,000 PrepBrain AI tokens.{" "}
            <span className="font-semibold text-kal-text">
              Step 2 — 2-day paid trial ({pro.trialPriceDisplay}):
            </span>{" "}
            15 voice minutes + 500,000 tokens.{" "}
            <span className="font-semibold text-kal-text">
              Step 3 — {pro.monthlyPriceDisplay}/month:
            </span>{" "}
            60 voice minutes
            + 2,000,000 (2 million) tokens per month, AutoPay for the duration you choose — cancel
            anytime.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-kal-text-secondary">
            After your free day, you can keep using Kalnehi with a 2-day paid trial for{" "}
            {pro.trialPriceDisplay}. When that trial ends, subscribe to the monthly plan to continue.
          </p>
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

        {!hasPaidAccess || isCancelledWithAccess ? (
          <AutopayDurationPanel
            value={autopayMonths}
            onChange={setAutopayMonths}
            disabled={busy}
            hasHadTrial={hasHadTrial}
          />
        ) : null}

        <div className="mx-auto max-w-lg">
          <article className="kal-glass-panel relative flex min-h-0 flex-col rounded-2xl border-2 border-kal-accent/50 p-5 pb-6 ring-2 ring-kal-accent/30">
            <span className="absolute -top-3 left-4 rounded-full bg-kal-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-kal-accent-foreground">
              Pro
            </span>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-kal-accent">
                <Crown className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-kal-text">{pro.name}</h2>
            </div>
            <p className="mt-1 text-xs text-kal-text-secondary">{pro.tagline}</p>

            <ol className="mt-4 space-y-2 rounded-xl border border-kal-accent/30 bg-kal-accent/5 px-3 py-3 text-left text-xs leading-relaxed text-kal-text-secondary">
              <li>
                <span className="font-semibold text-kal-text">1.</span> Free: 1 day · 5 min voice ·
                3,00,000 (3 lakh) AI tokens
              </li>
              <li>
                <span className="font-semibold text-kal-text">2.</span> Paid trial: 2 days ·{" "}
                {pro.trialPriceDisplay} · 15 min voice · 5,00,000 (5 lakh) tokens — keeps access after
                your free day.
              </li>
              <li>
                <span className="font-semibold text-kal-text">3.</span> Then {pro.monthlyPriceDisplay}
                /mo · 60 min voice · 2,000,000 (2 million) tokens (resets monthly) — continue after the
                paid trial.
              </li>
            </ol>

            <div className="mt-4 rounded-xl border border-kal-accent/40 bg-kal-accent/10 px-3 py-3">
              {hasHadTrial && !hasPaidAccess ? (
                <>
                  <p className="text-lg font-bold leading-snug text-kal-text">
                    {pro.monthlyPriceDisplay}/month
                  </p>
                  <p className="mt-1 text-xs font-medium leading-snug text-kal-text-secondary">
                    No trial — charged monthly from first payment. Uses the AutoPay length you set
                    above.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold leading-snug text-kal-text">
                    {pro.trialPriceDisplay} for 2 days
                  </p>
                  <p className="mt-1 text-sm font-semibold text-kal-text">
                    → then {pro.monthlyPriceDisplay}/month
                  </p>
                  {!hasPaidAccess ? (
                    <p className="kal-glass-subtle mt-2 rounded-lg border border-white/30 px-2 py-1.5 text-[0.65rem] font-medium leading-snug text-kal-text-secondary dark:border-white/10">
                      AutoPay length uses the slider above (billed monthly after trial).
                    </p>
                  ) : null}
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
                void startCheckout();
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

        <div
          ref={helpyjiAnchorRef}
          className="h-px w-full max-w-5xl scroll-mt-4"
          aria-hidden
        />

        {isHelpyJiEligibleForPricingPage(user) ? (
          <HelpyJiChat
            surface="pricing"
            intersectionAnchorRef={helpyjiAnchorRef}
          />
        ) : null}

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
            {checkoutError.debugHint ? (
              <p className="mt-2 text-left text-xs leading-snug text-kal-accent-dark/90 dark:text-kal-accent/90">
                {checkoutError.debugHint}
              </p>
            ) : null}
            <div className="mt-1 flex justify-center">
              <PaymentErrorMailButton
                flow="Pricing — trial checkout"
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
