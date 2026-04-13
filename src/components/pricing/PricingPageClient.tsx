"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useMemo, useRef, useState } from "react";
import { Check, Crown, Sparkles, Zap } from "lucide-react";

import {
  activateRazorpaySubscription,
  createRazorpayTrialSubscription,
} from "@/actions/subscription";
import { CancelSubscriptionButton } from "@/components/subscription/CancelSubscriptionButton";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { SITE_NAME } from "@/lib/seo-metadata";
import {
  TIER_ORDER,
  TIERS,
  type SubscriptionTier,
  type TierConfig,
} from "@/lib/subscriptionTiers";
import { HelpyJiChat } from "@/components/helpyji/HelpyJiChat";
import { isHelpyJiEligibleForPricingPage } from "@/lib/helpyjiVisibility";
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
  const disabled = busy || hasPaidAccess;

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
        onClick={() => onSelect(config.id)}
        disabled={disabled}
        className={`mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60 ${
          highlighted
            ? "bg-kal-accent text-kal-accent-foreground"
            : "kal-glass-subtle border border-white/25 text-kal-text dark:border-white/12"
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
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const helpyjiAnchorRef = useRef<HTMLDivElement>(null);

  const showCancel =
    subscriptionStatus === "trial" || subscriptionStatus === "active";

  const startCheckout = useCallback(async (tier: SubscriptionTier) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const created = await createRazorpayTrialSubscription(tier);
      if (!created.ok) {
        setStatusMsg(created.error);
        return;
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        setStatusMsg("Unable to load payment window. Refresh and try again.");
        return;
      }

      const tierConfig = TIERS[tier];
      const rzp = new window.Razorpay({
        key: created.keyId,
        name: SITE_NAME,
        description: `${tierConfig.name} 3-Day Trial (${tierConfig.trialPriceDisplay})`,
        subscription_id: created.subscriptionId,
        amount: created.amountPaise,
        currency: "INR",
        theme: { color: "#ef4444" },
        handler: async (response: RazorpayCheckoutResponse) => {
          const updated = await activateRazorpaySubscription({ ...response });
          if (!updated.ok) {
            setStatusMsg(updated.error);
            return;
          }
          setStatusMsg(
            `${tierConfig.name} trial started. From next month onwards, you will be charged ${tierConfig.monthlyPriceDisplay} monthly. You can cancel anytime — you will not be charged from next month onwards.`,
          );
          window.location.assign("/");
        },
      });
      rzp.open();
    } catch (error) {
      setStatusMsg(
        error instanceof Error ? error.message : "Checkout failed.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

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
            upgrade applies immediately. From next month onwards, you will be
            charged the new monthly price. You can cancel anytime.
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
  }, [subscriptionStatus, hasPaidAccess]);

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
            {SITE_NAME} is fully paid — there is no free tier. Start with a
            3-day trial, then your plan renews monthly. You can cancel anytime
            — you will not be charged from next month onwards.
          </p>
        </header>

        {statusBanner}

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

        {statusMsg && (
          <p className="kal-glass-subtle rounded-xl px-4 py-3 text-center text-sm text-kal-text">
            {statusMsg}
          </p>
        )}
      </section>
    </>
  );
}
