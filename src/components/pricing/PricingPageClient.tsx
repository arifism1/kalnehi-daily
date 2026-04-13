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
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-kal-accent/25 bg-gradient-to-br from-white/95 via-kal-accent-soft/25 to-white/70 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.25)] backdrop-blur-md dark:from-zinc-900/95 dark:via-red-950/30 dark:to-zinc-900/80 dark:border-red-500/20 dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-kal-accent/15 blur-3xl dark:bg-red-500/10"
          aria-hidden
        />
        <div className="relative p-5 sm:p-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-kal-accent/15 text-kal-accent ring-1 ring-kal-accent/20">
              <CalendarClock className="h-6 w-6" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-kal-accent">
                Before you pick a tier
              </p>
              <h2 className="mt-1.5 text-lg font-bold leading-tight tracking-tight text-kal-text sm:text-xl">
                How long should AutoPay run?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
                Billing stays{" "}
                <span className="font-semibold text-kal-text">monthly</span> (one charge per month).
                You only choose how many of those monthly charges your UPI or card mandate is allowed
                to take after your trial. Cancel anytime — you keep access through what you already
                paid for.
              </p>
            </div>
          </div>

          <fieldset className="mt-6 space-y-5 sm:mt-7" disabled={disabled}>
            <legend className="sr-only">
              Number of months to authorize for AutoPay, from {AUTOPAY_MONTHS_MIN} to{" "}
              {AUTOPAY_MONTHS_MAX}
            </legend>

            <div>
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-wide text-kal-text-secondary"
                id="autopay-preset-legend"
              >
                Quick picks
              </p>
              <div
                className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/50 bg-black/[0.035] p-1.5 sm:grid-cols-4 sm:gap-1 dark:border-white/10 dark:bg-white/[0.06]"
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
                      className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl px-1 py-2 text-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kal-accent ${
                        selected
                          ? "bg-kal-accent text-kal-accent-foreground shadow-md ring-1 ring-kal-accent/30"
                          : "text-kal-text-secondary hover:bg-white/60 hover:text-kal-text dark:hover:bg-white/[0.08]"
                      }`}
                    >
                      <span className="text-lg font-bold tabular-nums leading-none">{m}</span>
                      <span className="mt-0.5 text-[0.65rem] font-semibold leading-none opacity-90">
                        {m === 1 ? "month" : "months"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <label
                  htmlFor="autopay-months-range"
                  className="max-w-[70%] text-xs font-semibold leading-snug text-kal-text-secondary sm:text-sm"
                >
                  Or drag to any length ({AUTOPAY_MONTHS_MIN}–{AUTOPAY_MONTHS_MAX} months)
                </label>
                <span
                  className="shrink-0 text-right"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="block text-3xl font-bold tabular-nums leading-none text-kal-accent">
                    {value}
                  </span>
                  <span className="mt-0.5 block text-[0.7rem] font-medium capitalize text-kal-text-secondary">
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
                className="h-3 w-full cursor-pointer appearance-none rounded-full bg-kal-card-muted accent-kal-accent disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="mt-1.5 flex justify-between text-[0.65rem] font-medium tabular-nums text-kal-text-secondary/90">
                <span>{AUTOPAY_MONTHS_MIN}</span>
                <span aria-hidden>·</span>
                <span>{AUTOPAY_MONTHS_MAX}</span>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08]">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2.5}
                aria-hidden
              />
              <p className="text-xs leading-relaxed text-kal-text sm:text-sm">
                <span className="font-semibold text-kal-text">Summary:</span> After your trial, AutoPay
                can take up to{" "}
                <span className="font-bold text-kal-accent tabular-nums">{value}</span> monthly
                payment{value === 1 ? "" : "s"}, then it stops unless you subscribe again.
              </p>
            </div>
          </fieldset>
        </div>
      </div>
      <p className="text-center text-[0.7rem] font-medium uppercase tracking-[0.14em] text-kal-text-secondary">
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

function trialAiSummary(config: TierConfig): string {
  if (config.trialPhotoScansLimit === 0 && config.trialVoiceMinutesLimit === 0) {
    return "0 scans + 0 voice minutes during trial";
  }
  if (config.id === "basic") {
    return `Bonus gift: ${config.trialPhotoScansLimit} photo scans + ${config.trialVoiceMinutesLimit} voice min (trial only)`;
  }
  return `Only ${config.trialPhotoScansLimit} scans + ${config.trialVoiceMinutesLimit} voice minutes during trial`;
}

function fullAiSummary(config: TierConfig): string {
  if (config.photoScansPerMonth === 0 && config.voiceMinutesPerMonth === 0) {
    return "0 scans + 0 voice minutes / month (no AI)";
  }
  return `${config.photoScansPerMonth} scans + ${config.voiceMinutesPerMonth} voice min / month after trial`;
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
    buttonLabel = "Active Subscription";
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
          {trialAiSummary(config)}
        </p>
        <p className="mt-2 border-t border-kal-accent/25 pt-2 text-xs leading-relaxed text-kal-text-secondary">
          <span className="font-semibold text-kal-text">Full plan: </span>
          {fullAiSummary(config)}
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

      {config.photoScansPerMonth === 0 ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {config.id === "basic"
            ? "Regular Basic plan has no AI — the scans + voice minutes above are a one-time trial gift only."
            : "No AI features (no voice dictation, no handwritten scanner)"}
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
        setCheckoutError({ text: created.error });
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
            " During your 3-day trial, enjoy 2 minutes of voice dictation and 3 handwritten photo scans as a bonus gift to taste Pro. These are a one-time gift — after your trial, the Basic plan (₹99/month) has no AI features.";
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
