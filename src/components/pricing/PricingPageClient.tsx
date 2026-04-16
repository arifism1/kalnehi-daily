"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useMemo, useRef, useState } from "react";
import { CalendarClock, Check, Crown, Sparkles, Zap } from "lucide-react";

import {
  activateRazorpaySubscription,
  createRazorpayTrialSubscription,
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
import { SITE_NAME } from "@/lib/seo-metadata";
import {
  TIER_ORDER,
  TIERS,
  type SubscriptionTier,
  type TierConfig,
} from "@/lib/subscriptionTiers";
import { HelpyJiChat } from "@/components/helpyji/HelpyJiChat";
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

const AUTOPAY_PRESET_MONTHS = [1, 3, 6, 12] as const;

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
      <div className="relative overflow-hidden rounded-xl border border-kal-accent/25 bg-gradient-to-br from-white/95 via-kal-accent-soft/25 to-white/70 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.22)] backdrop-blur-md dark:from-zinc-900/95 dark:via-red-950/30 dark:to-zinc-900/80 dark:border-red-500/20 dark:shadow-[0_20px_48px_-18px_rgba(0,0,0,0.45)]">
        <div
          className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-kal-accent/12 blur-2xl dark:bg-red-500/10"
          aria-hidden
        />
        <div className="relative p-3 sm:p-4">
          <div className="flex gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-kal-accent/15 text-kal-accent ring-1 ring-kal-accent/20 sm:h-10 sm:w-10">
              <CalendarClock className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-kal-accent">
                Before you pick a tier
              </p>
              <h2 className="mt-0.5 text-base font-bold leading-tight tracking-tight text-kal-text sm:text-lg">
                How long should AutoPay run?
              </h2>
              <p className="mt-1 text-xs leading-snug text-kal-text-secondary sm:mt-1.5">
                <span className="font-semibold text-kal-text">Monthly</span> billing: set how many
                post-trial monthly charges your UPI or card mandate may take. Cancel anytime; you keep
                access for what you&apos;ve already paid.
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
                className="grid grid-cols-4 gap-1 rounded-xl border border-white/50 bg-black/[0.035] p-1 dark:border-white/10 dark:bg-white/[0.06]"
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
                          : "text-kal-text-secondary hover:bg-white/60 hover:text-kal-text dark:hover:bg-white/[0.08]"
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

            <div className="flex gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-2.5 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08]">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2.5}
                aria-hidden
              />
              <p className="text-[0.7rem] leading-snug text-kal-text sm:text-xs">
                <span className="font-semibold text-kal-text">Summary:</span> After trial, up to{" "}
                <span className="font-bold text-kal-accent tabular-nums">{value}</span> monthly
                payment{value === 1 ? "" : "s"}, then stops unless you subscribe again.
              </p>
            </div>
          </fieldset>
        </div>
      </div>
      <p className="text-center text-[0.65rem] font-medium uppercase tracking-[0.12em] text-kal-text-secondary">
        Next — choose your plan below
      </p>
    </div>
  );
}

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  basic: <Zap className="h-5 w-5" />,
  pro: <Crown className="h-5 w-5" />,
  pro_max: <Sparkles className="h-5 w-5" />,
};

/** Scannable, benefit-focused AI quota line(s) for the tier card (no “missing out” framing). */
function tierAiQuotaCopy(config: TierConfig): string {
  if (config.id === "basic") {
    return `Your trial includes ${config.trialPhotoScansLimit} AI photo scans and ${config.trialVoiceMinutesLimit} voice minutes — a quick way to try faster capture.`;
  }
  if (config.id === "pro") {
    return "20 AI Scans & 40 Voice Minutes per month (includes 5 scans + 10 mins during 3-day trial)";
  }
  return "50 AI Scans & 80 Voice Minutes per month (includes 10 scans + 20 mins during 3-day trial)";
}

function TierCard({
  config,
  highlighted,
  busy,
  hasPaidAccess,
  isCurrentTier,
  onSelect,
}: {
  config: TierConfig;
  highlighted: boolean;
  busy: boolean;
  hasPaidAccess: boolean;
  isCurrentTier: boolean;
  onSelect: (tier: SubscriptionTier) => void;
}) {
  const lockedBySubscription = hasPaidAccess;
  const disabled = busy;

  let buttonLabel: string;
  if (isCurrentTier) {
    buttonLabel = "Current Plan";
  } else if (hasPaidAccess) {
    buttonLabel = "Activate Subscription";
  } else if (busy) {
    buttonLabel = "Opening checkout...";
  } else {
    buttonLabel = `Start 3-day trial — ${config.trialPriceDisplay}`;
  }

  return (
    <article
      className={`kal-glass-card relative flex flex-col rounded-2xl border-2 p-5 ${
        highlighted ? "border-kal-accent" : "border-white/35 dark:border-white/15"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-4 rounded-full bg-kal-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-kal-accent-foreground">
          Most Popular
        </span>
      )}

      <div className="flex items-center gap-2">
        <span className={highlighted ? "text-kal-accent" : "text-kal-text-secondary"}>
          {TIER_ICONS[config.id]}
        </span>
        <h2 className="text-lg font-bold text-kal-text">{config.name}</h2>
      </div>

      <p className="mt-1 text-xs text-kal-text-secondary">{config.tagline}</p>

      <div className="mt-4 rounded-xl border border-kal-accent/40 bg-kal-accent/10 px-3 py-3">
        <p className="text-lg font-bold leading-snug text-kal-text">
          {config.trialPriceDisplay} for 3 days
        </p>
        <p className="mt-1 text-sm font-semibold text-kal-text">
          → then {config.monthlyPriceDisplay}/month
        </p>
        {!hasPaidAccess ? (
          <p className="mt-2 rounded-lg border border-white/30 bg-white/30 px-2 py-1.5 text-[0.65rem] font-medium leading-snug text-kal-text-secondary dark:border-white/10 dark:bg-black/20">
            Uses the AutoPay length you set above (still billed monthly).
          </p>
        ) : null}
        <p className="mt-2 text-xs font-medium leading-relaxed text-kal-text-secondary">
          {tierAiQuotaCopy(config)}
        </p>
      </div>

      <ul className="mt-4 flex-1 space-y-1.5">
        {config.benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-xs leading-snug text-kal-text-secondary sm:text-sm">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {config.id === "basic" ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Want AI Photo Scans and Voice Dictation? Upgrade to Pro for just ₹21 for 3 days.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (lockedBySubscription) return;
          onSelect(config.id);
        }}
        disabled={disabled}
        aria-disabled={lockedBySubscription || undefined}
        className={`mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60 ${
          highlighted || lockedBySubscription
            ? "bg-kal-accent text-kal-accent-foreground shadow-sm ring-1 ring-kal-accent/30"
            : "kal-glass-subtle border border-white/25 text-kal-text dark:border-white/12"
        } ${
          lockedBySubscription
            ? "cursor-default"
            : "transition hover:brightness-[1.04] active:scale-[0.99]"
        }`}
      >
        {buttonLabel}
      </button>
    </article>
  );
}

export function PricingPageClient() {
  const {
    hasPaidAccess,
    status: subscriptionStatus,
    tier: currentTier,
  } = useSubscriptionAccess();
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

  const startCheckout = useCallback(async (tier: SubscriptionTier) => {
    setBusy(true);
    setCheckoutError(null);
    try {
      const created = await createRazorpayTrialSubscription(tier, autopayMonths);
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

      const tierConfig = TIERS[tier];
      const rzp = new window.Razorpay({
        key: created.keyId,
        name: SITE_NAME,
        description: `${tierConfig.name} 3-day trial (${tierConfig.trialPriceDisplay}) · then ${tierConfig.monthlyPriceDisplay}/mo · AutoPay up to ${autopayMonths} monthly charge${autopayMonths === 1 ? "" : "s"}`,
        subscription_id: created.subscriptionId,
        amount: created.amountPaise,
        currency: "INR",
        theme: { color: "#ef4444" },
        handler: async (response: RazorpayCheckoutResponse) => {
          const updated = await activateRazorpaySubscription({ ...response });
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
        text: error instanceof Error ? error.message : "Checkout failed.",
      });
    } finally {
      setBusy(false);
    }
  }, [autopayMonths]);

  const statusBanner = useMemo(() => {
    if (hasPaidAccess) {
      let trialHint = "";
      if (subscriptionStatus === "trial") {
        if (currentTier === "basic") {
          trialHint =
            " During your 3-day trial you have 3 AI photo scans and 2 voice minutes to try faster capture. When you’re ready for monthly AI quotas, upgrade to Pro from My Plan.";
        } else {
          trialHint =
            " During the 3-day trial you have the trial AI limits shown on each card. After the first successful charge you get the full monthly quotas for your tier.";
        }
      }
      return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            You already have access.
            {trialHint}{" "}
            To move to a higher tier, use{" "}
            <Link href="/my-plan" className="font-bold underline underline-offset-2">
              My Plan
            </Link>
            : pay only the prorated amount now for the rest of this month —
            upgrade applies immediately. Your remaining AutoPay months carry over (no new 12-month
            mandate). From the next billing cycle you are charged the new monthly price. You can
            cancel anytime.
          </p>
        </div>
      );
    }
    if (subscriptionStatus === "expired") {
      return (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4 dark:border-rose-800 dark:bg-rose-950/30">
          <p className="text-sm font-medium text-rose-800 dark:text-rose-200">
            Your last payment could not be processed. Subscribe again to
            continue using {SITE_NAME}.
          </p>
        </div>
      );
    }
    if (subscriptionStatus === "cancelled" && !hasPaidAccess) {
      return (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Your subscription has been cancelled and access has ended.
            Choose a plan to get back to your daily routine.
          </p>
        </div>
      );
    }
    return null;
  }, [subscriptionStatus, hasPaidAccess, currentTier]);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <section className="mx-auto max-w-5xl space-y-8 pb-10">
        <header className="kal-glass-panel rounded-2xl px-6 py-8 text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-kal-accent">
            Choose Your Plan
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-kal-text">
            Pick the plan that fits your goals
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-kal-text-secondary">
            {SITE_NAME} is fully paid — there is no free tier. Start with a 3-day trial, then pay
            monthly. First set how long AutoPay may run, then pick a plan — you can cancel anytime.
          </p>
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border-2 border-kal-accent/40 bg-gradient-to-br from-kal-accent/12 via-white/50 to-white/30 px-4 py-4 shadow-[0_16px_40px_-24px_rgba(239,68,68,0.35)] backdrop-blur-md dark:from-kal-accent/15 dark:via-zinc-900/40 dark:to-zinc-900/25 sm:px-5">
            <p className="text-sm font-semibold text-kal-text">
              New here? Take the 2-minute feature tour first.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/what-can-kalnehi-do"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-kal-accent px-4 py-2.5 text-center text-sm font-bold text-kal-accent-foreground transition hover:brightness-105 active:scale-[0.99]"
              >
                What Can Kalnehi Do?
              </Link>
              <Link
                href="/best-study-practices"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-kal-accent/40 bg-white/60 px-4 py-2.5 text-center text-sm font-semibold text-kal-text transition hover:border-kal-accent hover:bg-kal-accent/10 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
              >
                🔬 Why these practices work
              </Link>
            </div>
          </div>
        </header>

        {statusBanner}

        {!hasPaidAccess ? (
          <AutopayDurationPanel value={autopayMonths} onChange={setAutopayMonths} disabled={busy} />
        ) : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {TIER_ORDER.map((tierId) => (
            <TierCard
              key={tierId}
              config={TIERS[tierId]}
              highlighted={tierId === "pro"}
              busy={busy}
              hasPaidAccess={hasPaidAccess}
              isCurrentTier={currentTier === tierId && hasPaidAccess}
              onSelect={startCheckout}
            />
          ))}
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

        {showCancel && (
          <div className="mx-auto max-w-sm">
            <CancelSubscriptionButton />
          </div>
        )}

        {checkoutError ? (
          <div className="kal-glass-subtle rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center dark:border-rose-900 dark:bg-rose-950/30">
            <p className="text-sm text-rose-900 dark:text-rose-100" role="status">
              {checkoutError.text}
            </p>
            {checkoutError.debugHint ? (
              <p className="mt-2 text-left text-xs leading-snug text-rose-800/90 dark:text-rose-200/90">
                {checkoutError.debugHint}
              </p>
            ) : null}
            <div className="mt-1 flex justify-center">
              <PaymentErrorMailButton
                flow="Pricing — trial checkout"
                error={checkoutError.text}
                userEmail={userEmail}
                proof={checkoutError.proof}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 underline-offset-2 hover:underline dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-50"
              />
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
