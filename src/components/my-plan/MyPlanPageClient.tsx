"use client";

import Link from "next/link";
import Script from "next/script";
import { addMonths, differenceInCalendarDays, format, parse } from "date-fns";
import { ArrowLeft, Bot, Brain, Crown, Loader2, Mic, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  cancelSubscription,
  createRazorpayMonthlySubscription,
  activateRazorpayMonthlySubscription,
} from "@/actions/subscription";
import { getAiStudyPartnerBalance } from "@/actions/aiStudyPartner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExtraCreditsSection } from "@/components/settings/ExtraCreditsSection";
import { AiStudyPartnerPurchaseModal } from "@/components/study/AiStudyPartnerPurchaseModal";
import { isAiStudyPartnerUiEnabled } from "@/lib/aiStudyPartnerUi";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAiGate } from "@/hooks/useAiGate";
import { useFreeTrialLiveEndsIn } from "@/hooks/useFreeTrialLiveEndsIn";
import { clampAutopayMonths, DEFAULT_AUTOPAY_MONTHS } from "@/lib/autopayMonths";
import {
  formatVoiceMinutesFractionalCompact,
  formatWelcomeVoiceTimeLeft,
  FREE_TRIAL_VOICE_CAP_SECONDS,
} from "@/lib/freeTrial";
import { SITE_NAME } from "@/lib/seo-metadata";
import type { AiUsagePhase, PrepBrainUsagePayload } from "@/lib/prepbrainTokens";
import {
  SMART_PLAN_ANNUAL_BILLING_LABEL,
  SMART_PLAN_SIX_MONTH_BILLING_LABEL,
} from "@/lib/smartPlanPricing";
import { getTierConfig, TIERS } from "@/lib/subscriptionTiers";
import { istNextUsagePeriodStartDateString } from "@/lib/subscriptionUsage";
import { useAuthStore } from "@/store/useAuthStore";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = { open: () => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const RESUB_PRESET_MONTHS = [1, 2, 3, 6, 12] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "d MMM yyyy");
}

function statusLabel(status: string | null): string {
  switch (status) {
    case "trial":
      return "Smart Plan (Trial)";
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return "No plan";
  }
}

function statusColor(status: string | null): string {
  switch (status) {
    case "trial":
    case "active":
      return "text-emerald-700 dark:text-emerald-400";
    case "cancelled":
      return "text-amber-700 dark:text-amber-400";
    case "expired":
      return "text-[var(--kal-danger-text)]";
    default:
      return "text-kal-text-secondary";
  }
}

function trialDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const left = differenceInCalendarDays(end, new Date());
  return Math.max(0, left);
}

function UsageBar({
  icon,
  label,
  used,
  limit,
  formatAsVoiceTime,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  /** When true, show used/limit as Xm Ys (fractional minute values from the server). */
  formatAsVoiceTime?: boolean;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const atLimit = limit > 0 && used >= limit;
  const summary = formatAsVoiceTime
    ? `${formatVoiceMinutesFractionalCompact(used)} / ${formatVoiceMinutesFractionalCompact(limit)}`
    : `${used} / ${limit}`;

  return (
    <div className="space-y-1.5 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-kal-text-secondary">
          {icon}
          <span>{label}</span>
        </div>
        <span
          className={`text-sm font-medium ${atLimit ? "text-[var(--kal-danger-text)]" : "text-kal-text"}`}
        >
          {summary}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-kal-card-muted">
        <div
          className={`h-full rounded-full transition-all ${
            atLimit
              ? "bg-[var(--kal-danger-text)]"
              : pct > 75
                ? "bg-amber-500"
                : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TokenUsageBar({
  icon,
  label,
  used,
  limit,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const atLimit = limit > 0 && used >= limit;
  const fmt = (n: number) => n.toLocaleString("en-IN");

  return (
    <div className="space-y-1.5 border-t border-kal-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-kal-text-secondary">
          {icon}
          <span>{label}</span>
        </div>
        <span
          className={`text-sm font-medium ${atLimit ? "text-[var(--kal-danger-text)]" : "text-kal-text"}`}
        >
          {fmt(used)} / {fmt(limit)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-kal-card-muted">
        <div
          className={`h-full rounded-full transition-all ${
            atLimit
              ? "bg-[var(--kal-danger-text)]"
              : pct > 75
                ? "bg-amber-500"
                : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MyPlanPageClient() {
  const {
    loading,
    status,
    hasPaidAccess,
    tier,
    plan,
    startDate,
    endDate,
    autopayMonthsTotal,
    freeTrialActive,
    freeTrialEndsAtIso,
    freeTrialVoiceSecondsRemaining,
    trialVoiceSecondsUsed,
    welcomeTrialExpiredNoPay,
    refetch,
    refetchVersion,
    usage: subscriptionUsage,
  } = useSubscriptionAccess();
  const {
    hasAiAccess,
    voiceMinutesUsed,
    voiceMinutesLimit,
    monthlyVoiceMinuteLimit,
    bonusVoiceMinutesRemaining,
    bonusVoiceMinutesNextExpiry,
  } = useAiGate();
  const [prepbrainUsage, setPrepbrainUsage] = useState<PrepBrainUsagePayload | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [autopayMonths, setAutopayMonths] = useState(DEFAULT_AUTOPAY_MONTHS);
  const [resubBusy, setResubBusy] = useState(false);
  const [resubError, setResubError] = useState<string | null>(null);
  const [aiPartnerBalance, setAiPartnerBalance] = useState<number | null>(null);
  const [partnerPurchaseOpen, setPartnerPurchaseOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  const tierConfig = getTierConfig(tier);

  const isAnnualPlan = plan === "annual";
  const isSixMonthPlan = plan === "six_month";
  const isUpfrontPlan = isAnnualPlan || isSixMonthPlan;
  const canCancel = (status === "trial" || status === "active") && !isUpfrontPlan;
  const isCancelled = status === "cancelled";
  const isCancelledWithAccess = isCancelled && hasPaidAccess;
  const noActivePlan =
    !status || status === "expired" || (isCancelled && !hasPaidAccess);

  const onWelcomeTrial = freeTrialActive && !hasPaidAccess;

  const welcomeEndsIn = useFreeTrialLiveEndsIn(freeTrialEndsAtIso, onWelcomeTrial);

  const nextVoicePhotoResetLabel = (() => {
    const next = istNextUsagePeriodStartDateString(startDate);
    if (!next) return "—";
    return format(parse(next, "yyyy-MM-dd", new Date()), "d MMM yyyy");
  })();

  useEffect(() => {
    if (!user?.id || loading) return;
    let cancelled = false;

    function inferPaidPlanTokenPhase():
      | "paid_trial"
      | "monthly"
      | undefined {
      if (!hasPaidAccess) return undefined;
      if (status === "trial") return "paid_trial";
      if (status === "active" || status === "cancelled") return "monthly"; // annual also uses monthly token phase
      return undefined;
    }

    void (async () => {
      try {
        const res = await fetch("/api/prepbrain/usage", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = (await res.json()) as {
          ok?: boolean;
          usage?: PrepBrainUsagePayload;
          phase?: AiUsagePhase;
        };
        if (cancelled) return;
        if (!data.ok || !data.usage) {
          setPrepbrainUsage(null);
          return;
        }
        const inferred = inferPaidPlanTokenPhase();
        const merged: AiUsagePhase =
          data.usage.phase ??
          data.phase ??
          inferred ??
          "none";
        const phase: AiUsagePhase =
          merged !== "none" ? merged : inferred ?? merged;
        setPrepbrainUsage({ ...data.usage, phase });
      } catch {
        if (!cancelled) setPrepbrainUsage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    loading,
    status,
    hasPaidAccess,
    onWelcomeTrial,
    refetchVersion,
  ]);

  useEffect(() => {
    if (!isAiStudyPartnerUiEnabled || !user?.id) return;
    let cancelled = false;
    void getAiStudyPartnerBalance()
      .then((bal) => { if (!cancelled) setAiPartnerBalance(bal); })
      .catch(() => { if (!cancelled) setAiPartnerBalance(0); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const startResubscribe = useCallback(async () => {
    setResubBusy(true);
    setResubError(null);
    try {
      const created = await createRazorpayMonthlySubscription("pro", autopayMonths);
      if (!created.ok) {
        setResubError(surfaceErrorForUi(created.error));
        return;
      }
      if (typeof window === "undefined" || !window.Razorpay) {
        setResubError("Unable to load payment window. Refresh and try again.");
        return;
      }
      const tc = TIERS.pro;
      const description = `${tc.name} (${tc.monthlyPriceDisplay}/mo) · AutoPay up to ${autopayMonths} monthly charge${autopayMonths === 1 ? "" : "s"}`;
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
            setResubError(surfaceErrorForUi(updated.error));
            return;
          }
          window.location.assign("/home");
        },
      });
      rzp.open();
    } catch (e) {
      setResubError(surfaceErrorForUi(e));
    } finally {
      setResubBusy(false);
    }
  }, [autopayMonths]);

  function handleCancel() {
    setConfirmOpen(false);
    startTransition(async () => {
      setMessage(null);
      const res = await cancelSubscription();
      if (!res.ok) {
        setMessage(surfaceErrorForUi(res.error));
        return;
      }
      refetch();
    });
  }

  const confirmDescription =
    status === "trial"
      ? `You can cancel anytime — you will not be charged from next month onwards. Your trial access stays active until ${formatDate(endDate)}.`
      : `You can cancel anytime — you will not be charged from next month onwards. Your plan stays active until the end of this month (${formatDate(endDate)}).`;

  const rows: { label: string; value: string; className?: string }[] = [
    {
      label: "Status",
      value: statusLabel(status),
      className: statusColor(status),
    },
  ];

  if (tier && hasPaidAccess) {
    rows.push({ label: "Tier", value: tierConfig.name });
  }

  if (status === "trial" && endDate && hasPaidAccess) {
    const left = trialDaysRemaining(endDate);
    if (left !== null) {
      rows.push({
        label: "Trial remaining",
        value: left === 0 ? "Ends today" : left === 1 ? "1 day" : `${left} days`,
        className: "text-kal-accent",
      });
    }
  }

  if (status && status !== "expired" && !(isCancelled && !hasPaidAccess)) {
    rows.push({
      label: "Billing",
      value: isAnnualPlan
        ? `${SMART_PLAN_ANNUAL_BILLING_LABEL} · one-time payment`
        : isSixMonthPlan
          ? `${SMART_PLAN_SIX_MONTH_BILLING_LABEL} · one-time payment`
          : plan === "monthly" || plan === "trial"
            ? `${tierConfig.monthlyPriceDisplay}/month · cancel anytime`
            : (plan ?? "—"),
    });
  }

  if (
    autopayMonthsTotal !== null &&
    hasPaidAccess &&
    (status === "trial" || status === "active" || status === "cancelled")
  ) {
    rows.push({
      label: "AutoPay cap",
      value: `Up to ${autopayMonthsTotal} monthly charge${autopayMonthsTotal === 1 ? "" : "s"} (then renewals stop unless you subscribe again)`,
      className: "text-kal-text-secondary",
    });
  }

  if (startDate) {
    rows.push({ label: "Started", value: formatDate(startDate) });
  }

  if (endDate && (status === "trial" || status === "active" || isCancelled)) {
    const label = isCancelled
      ? "Active until"
      : status === "trial"
        ? "Trial ends"
        : isUpfrontPlan
          ? "Plan runs until"
          : "Month ends on";
    rows.push({ label, value: formatDate(endDate) });
  }

  if (
    status === "trial" &&
    endDate &&
    autopayMonthsTotal !== null &&
    autopayMonthsTotal > 0
  ) {
    const paidUntil = addMonths(new Date(endDate), autopayMonthsTotal);
    rows.push({
      label: "Paid access until",
      value: formatDate(paidUntil.toISOString()),
      className: "text-kal-text-secondary",
    });
  }

  return (
    <>
    {isAiStudyPartnerUiEnabled && (
      <AiStudyPartnerPurchaseModal
        open={partnerPurchaseOpen}
        onClose={() => setPartnerPurchaseOpen(false)}
        onPurchased={() => {
          setPartnerPurchaseOpen(false);
          void getAiStudyPartnerBalance().then(setAiPartnerBalance).catch(() => null);
        }}
      />
    )}
    {(isCancelledWithAccess || welcomeTrialExpiredNoPay || onWelcomeTrial) && (
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
    )}
    <div className="mx-auto max-w-lg space-y-6 md:max-w-xl">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-kal-text-secondary hover:text-kal-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Subscription
        </p>
        <h1 className="kal-feature-title mt-1">My Subscription</h1>
        <p className="mt-1 text-sm leading-relaxed text-kal-text-secondary">
          {isAnnualPlan
            ? "Annual plan — one-time payment for 12 months of full access. No recurring charge."
            : isSixMonthPlan
              ? "6-month plan — one-time payment for 6 months of full access. No recurring charge."
              : "Monthly subscription — you are charged once per month. AutoPay is limited to the number of months you chose at signup (shown below when available). Cancel anytime; you keep access through the period you already paid for."}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-kal-accent" />
        </div>
      ) : (
        <>
          {onWelcomeTrial && freeTrialEndsAtIso ? (
            <div className="kal-glass-panel overflow-hidden rounded-2xl border border-kal-accent/35 bg-gradient-to-br from-kal-accent/10 to-kal-card-muted shadow-md dark:border-kal-accent/25">
              <div className="border-b border-kal-border px-5 py-3 sm:px-6">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                  7-day free trial
                </p>
                <p className="mt-1 text-sm font-medium text-kal-text">
                  {formatWelcomeVoiceTimeLeft(freeTrialVoiceSecondsRemaining)} of welcome voice time
                </p>
                {welcomeEndsIn ? (
                  <p className="mt-1 text-xs font-semibold tabular-nums text-kal-accent">
                    {welcomeEndsIn}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-kal-text-secondary">
                  Voice (5 min) and Mastermind tokens (60,000) are for the entire 7-day trial — use them within this window. After the trial ends, subscribe to Smart Plan ({TIERS.pro.monthlyPriceDisplay}/month) for 100 minutes of voice and 2 million tokens every month.
                </p>
              </div>
              <UsageBar
                icon={<Mic className="h-4 w-4" />}
                label="Welcome voice time"
                used={trialVoiceSecondsUsed}
                limit={FREE_TRIAL_VOICE_CAP_SECONDS}
              />
              {prepbrainUsage?.phase === "welcome" ? (
                <TokenUsageBar
                  icon={<Brain className="h-4 w-4" />}
                  label="Mastermind tokens (welcome)"
                  used={prepbrainUsage.used}
                  limit={prepbrainUsage.limit}
                />
              ) : null}
            </div>
          ) : null}

          {onWelcomeTrial && !hasPaidAccess ? (
            <div className="kal-glass-panel rounded-2xl border border-kal-accent/30 bg-kal-accent-soft/40 px-5 py-5 dark:bg-kal-accent/10">
              <h3 className="text-base font-bold text-kal-text">Upgrade to Smart Plan</h3>
              <p className="mt-2 text-sm text-kal-text-secondary">
                You&apos;re on your 7-day free trial. Subscribe now to keep full access after your trial —{" "}
                <span className="font-semibold text-kal-text">{TIERS.pro.monthlyPriceDisplay}/month</span>{" "}
                for 2 million Mastermind tokens and 100 minutes of voice per month.
              </p>
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-kal-text-secondary">AutoPay months:</p>
                <div className="flex flex-wrap gap-2">
                  {([1, 3, 6, 12] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAutopayMonths(m)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        autopayMonths === m
                          ? "bg-kal-accent text-white"
                          : "border border-kal-border bg-kal-card text-kal-text-secondary hover:border-kal-accent/40"
                      }`}
                    >
                      {m} {m === 1 ? "month" : "months"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void startResubscribe()}
                disabled={resubBusy}
                className="kal-btn-accent mt-4 min-h-[44px] w-full sm:w-auto"
              >
                {resubBusy ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  `Subscribe — ${TIERS.pro.monthlyPriceDisplay}/month`
                )}
              </button>
              {resubError ? (
                <p className="mt-3 text-sm text-[var(--kal-danger-text)]" role="status">
                  {resubError}
                </p>
              ) : null}
            </div>
          ) : null}

          {welcomeTrialExpiredNoPay && !hasPaidAccess ? (
            <div className="kal-glass-panel rounded-2xl border border-kal-accent/30 bg-kal-accent-soft/40 px-5 py-5 dark:bg-kal-accent/10">
              <h3 className="text-base font-bold text-kal-text">Your 7-day trial has ended</h3>
              <p className="mt-2 text-sm text-kal-text-secondary">
                Subscribe to Smart Plan to continue —{" "}
                <span className="font-semibold text-kal-text">{TIERS.pro.monthlyPriceDisplay}/month</span>{" "}
                for 2 million Mastermind tokens and 100 minutes of voice per month. Cancel anytime.
              </p>
              <button
                type="button"
                onClick={() => void startResubscribe()}
                disabled={resubBusy}
                className="kal-btn-accent mt-4 min-h-[44px] w-full sm:w-auto"
              >
                {resubBusy ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  `Subscribe — ${TIERS.pro.monthlyPriceDisplay}/month`
                )}
              </button>
              {resubError ? (
                <p className="mt-3 text-sm text-[var(--kal-danger-text)]" role="status">
                  {resubError}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Tier spotlight */}
          <div className="kal-glass-panel overflow-hidden rounded-2xl border border-kal-accent/30 shadow-lg dark:border-kal-accent/25">
            <div className="flex items-start gap-4 p-5 sm:p-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-kal-accent/15 text-kal-accent">
                <Crown className="h-6 w-6" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                  Current subscription
                </p>
                <h2 className="kal-section-heading mt-1.5">
                  {onWelcomeTrial
                    ? "Welcome trial (no charge)"
                    : noActivePlan
                      ? "No active plan"
                      : tierConfig.name}
                </h2>
                <p className="mt-1 text-sm text-kal-text-secondary">
                  {onWelcomeTrial
                    ? "You're on your 7-day free trial with 60,000 Mastermind tokens and 5 minutes of voice. Subscribe to Smart Plan anytime for the full monthly quota."
                    : noActivePlan
                      ? `Pick a plan to keep using ${SITE_NAME}.`
                      : tierConfig.tagline}
                </p>
                {hasPaidAccess && !noActivePlan ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status === "trial" || status === "active" ? "bg-kal-success-soft border-kal-success-border text-kal-success-text" : "bg-kal-warn-soft border-kal-warn-border text-kal-warn-text"}`}
                    >
                      {statusLabel(status)}
                    </span>
                    <span className="text-sm font-semibold text-kal-text">
                      {isAnnualPlan
                        ? SMART_PLAN_ANNUAL_BILLING_LABEL
                        : isSixMonthPlan
                          ? SMART_PLAN_SIX_MONTH_BILLING_LABEL
                          : `${tierConfig.monthlyPriceDisplay}/month`}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="kal-glass-panel overflow-hidden rounded-[1rem]">
            <ConfirmDialog
              open={confirmOpen}
              title="Cancel subscription?"
              description={confirmDescription}
              confirmLabel="Yes, cancel"
              cancelLabel="Keep subscription"
              danger
              onCancel={() => setConfirmOpen(false)}
              onConfirm={handleCancel}
            />

            <div className="border-b border-kal-border px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-kal-muted">
                Subscription &amp; dates
              </h3>
            </div>

            {rows.map((row) => (
              <div
                key={row.label}
                className="flex min-h-[48px] flex-col gap-1 border-b border-kal-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="shrink-0 text-sm text-kal-text-secondary">{row.label}</span>
                <span
                  className={`text-sm font-medium break-words text-right sm:max-w-[58%] ${row.className ?? "text-kal-text"}`}
                >
                  {row.value}
                </span>
              </div>
            ))}

            {hasAiAccess && hasPaidAccess && (
              <div className="border-t border-kal-border">
                <div className="border-b border-kal-border px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-kal-muted">
                    AI usage {status === "trial" ? "(Smart Plan trial)" : "(resets monthly)"}
                  </h3>
                </div>

                {status === "trial" ? (
                  <p className="border-b border-kal-border px-4 py-2 text-xs leading-relaxed text-kal-text-secondary">
                    <span className="font-medium text-kal-text">
                      {TIERS.pro.voiceMinutesPerMonth} voice minutes per month
                    </span>{" "}
                    after your first monthly charge — during this 7-day trial you have{" "}
                    <span className="font-medium text-kal-text">
                      {TIERS.pro.trialVoiceMinutesLimit} minutes
                    </span>{" "}
                    for voice dictation.
                  </p>
                ) : null}

                <UsageBar
                  icon={<Mic className="h-4 w-4" />}
                  label="Voice time (plan allowance)"
                  used={voiceMinutesUsed}
                  limit={monthlyVoiceMinuteLimit}
                  formatAsVoiceTime
                />
                {prepbrainUsage &&
                prepbrainUsage.phase === "monthly" ? (
                  <TokenUsageBar
                    icon={<Brain className="h-4 w-4" />}
                    label="Mastermind tokens (this month)"
                    used={prepbrainUsage.used}
                    limit={prepbrainUsage.limit}
                  />
                ) : null}
                {(bonusVoiceMinutesRemaining > 0 ||
                  subscriptionUsage.bonusAiTokens > 0) && (
                  <div className="space-y-2 border-t border-kal-border px-4 py-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                      Additional credits available
                    </p>
                    {bonusVoiceMinutesRemaining > 0 ? (
                      <p className="text-xs text-kal-text-secondary">
                        <span className="font-medium text-kal-text">Voice time (bonus): </span>
                        {formatVoiceMinutesFractionalCompact(bonusVoiceMinutesRemaining)}{" "}
                        remaining
                        {bonusVoiceMinutesNextExpiry ? (
                          <> · expires {formatDate(bonusVoiceMinutesNextExpiry)}</>
                        ) : null}
                      </p>
                    ) : null}
                    {subscriptionUsage.bonusAiTokens > 0 ? (
                      <p className="text-xs text-kal-text-secondary">
                        <span className="font-medium text-kal-text">Mastermind tokens: </span>
                        {subscriptionUsage.bonusAiTokens.toLocaleString("en-IN")} remaining
                        {subscriptionUsage.bonusAiTokensNextExpiry ? (
                          <> · expires {formatDate(subscriptionUsage.bonusAiTokensNextExpiry)}</>
                        ) : null}
                      </p>
                    ) : null}
                    <p className="text-[0.65rem] leading-relaxed text-kal-text-secondary">
                      Purchased add-ons are used before your included allowance and expire if unused.
                    </p>
                  </div>
                )}
                <div className="border-t border-kal-border px-4 py-2">
                  <p className="text-[0.65rem] leading-relaxed text-kal-text-secondary">
                    Bonus voice credits are used before your plan allowance. Combined voice capacity
                    this month: {formatVoiceMinutesFractionalCompact(voiceMinutesLimit)}.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-kal-border px-4 py-2">
                  <span className="text-xs text-kal-text-secondary">
                    Next included allowance reset
                  </span>
                  <span className="text-xs font-medium text-kal-text">
                    {nextVoicePhotoResetLabel}
                  </span>
                </div>
              </div>
            )}

            {isCancelledWithAccess && (
              <div className="border-t border-kal-border">
                <div className="bg-kal-warn-soft border border-kal-warn-border px-4 py-3">
                  <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                    Subscription cancelled. You will not be charged from next month onwards.
                    Your plan stays active until {formatDate(endDate)}.
                  </p>
                </div>
                <div className="border-t border-kal-border px-4 py-4 space-y-3">
                  <div>
                    <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-kal-text-secondary">
                      AutoPay months for new plan
                    </p>
                    <div className="kal-glass-subtle grid grid-cols-4 gap-1 rounded-xl border border-white/50 p-1 dark:border-white/10">
                      {RESUB_PRESET_MONTHS.map((m) => {
                        const selected = autopayMonths === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setAutopayMonths(clampAutopayMonths(m))}
                            className={`flex min-h-[40px] flex-col items-center justify-center rounded-lg px-0.5 py-1 text-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kal-accent ${
                              selected
                                ? "bg-kal-accent text-kal-accent-foreground shadow-sm ring-1 ring-kal-accent/30"
                                : "text-kal-text-secondary hover:bg-kal-card-muted hover:text-kal-text"
                            }`}
                          >
                            <span className="text-base font-bold tabular-nums leading-none">{m}</span>
                            <span className="mt-0.5 text-[0.6rem] font-semibold leading-none opacity-90">
                              {m === 1 ? "month" : "months"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={resubBusy}
                    onClick={startResubscribe}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-4 py-2.5 text-sm font-semibold text-kal-accent-foreground transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
                  >
                    {resubBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Opening checkout...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Resubscribe to {tierConfig.name} — {TIERS.pro.monthlyPriceDisplay}/month
                      </>
                    )}
                  </button>
                  {resubError ? (
                    <p className="text-xs text-[var(--kal-danger-text)]" role="status">
                      {resubError}
                    </p>
                  ) : null}
                  <p className="text-center text-[0.65rem] text-kal-text-secondary">
                    Want a different plan?{" "}
                    <a href="/pricing" className="font-semibold text-kal-accent underline underline-offset-2">
                      Browse all plans on Pricing
                    </a>
                  </p>
                </div>
              </div>
            )}

            {isCancelled && !hasPaidAccess && (
              <div className="border-t border-kal-warn-border bg-kal-warn-soft px-4 py-3">
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                  Subscription cancelled and access has ended.
                </p>
              </div>
            )}

            {canCancel && (
              <div className="border-t border-kal-border px-4 py-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--kal-danger-text)] disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : status === "trial" ? (
                    "Cancel Trial"
                  ) : (
                    "Cancel Subscription"
                  )}
                </button>
                {message ? (
                  <p className="mt-2 text-xs text-kal-text-secondary" role="status">
                    {message}
                  </p>
                ) : null}
              </div>
            )}

            {isUpfrontPlan && hasPaidAccess && endDate && (
              <div className="border-t border-kal-border px-4 py-3">
                <p className="text-xs leading-relaxed text-kal-text-secondary">
                  Your {isAnnualPlan ? "annual" : "6-month"} plan runs until{" "}
                  <span className="font-semibold text-kal-text">{formatDate(endDate)}</span>.
                  This was a one-time payment — there is no recurring charge to cancel.
                </p>
              </div>
            )}

            {noActivePlan && (
              <div className="border-t border-kal-border px-4 py-3">
                <a
                  href="/pricing"
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-kal-accent px-4 py-2.5 text-sm font-semibold text-kal-accent-foreground"
                >
                  Choose a Plan
                </a>
              </div>
            )}
          </div>

          {/* AI Study Partner balance */}
          {isAiStudyPartnerUiEnabled && user?.id ? (() => {
            const totalSec = aiPartnerBalance ?? 0;
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;
            const balanceText =
              aiPartnerBalance === null
                ? "Loading…"
                : totalSec === 0
                  ? "No time remaining"
                  : h > 0
                    ? `${h}h ${m}m${s > 0 ? ` ${s}s` : ""} remaining`
                    : m > 0
                      ? `${m}m ${s}s remaining`
                      : `${s}s remaining`;

            return (
              <div
                id="ai-study-partner"
                className="mt-4 scroll-mt-24 rounded-2xl border border-kal-border bg-kal-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-kal-accent/10">
                      <Bot className="h-4.5 w-4.5 text-kal-accent" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                        AI Study Partner
                      </p>
                      <p className={`mt-0.5 text-sm font-semibold ${totalSec === 0 && aiPartnerBalance !== null ? "text-amber-600 dark:text-amber-400" : "text-kal-text"}`}>
                        {balanceText}
                      </p>
                      <p className="mt-0.5 text-[11px] text-kal-muted">
                        Non-expiring · deducted only when you use it
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPartnerPurchaseOpen(true)}
                    className="shrink-0 inline-flex min-h-[36px] items-center justify-center rounded-xl bg-kal-accent px-3 py-1.5 text-xs font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover"
                  >
                    {totalSec === 0 && aiPartnerBalance !== null ? "Buy 30 hrs — ₹799" : "Buy More Hours"}
                  </button>
                </div>
              </div>
            );
          })() : null}

          {hasAiAccess && hasPaidAccess && <ExtraCreditsSection />}
        </>
      )}
    </div>
    </>
  );
}
