"use client";

import Link from "next/link";
import Script from "next/script";
import { addMonths, differenceInCalendarDays, format } from "date-fns";
import { ArrowLeft, Brain, Crown, Loader2, Mic, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  cancelSubscription,
  createRazorpayTrialSubscription,
  activateRazorpaySubscription,
  createRazorpayMonthlySubscription,
  activateRazorpayMonthlySubscription,
} from "@/actions/subscription";
import { HelpyJiChat } from "@/components/helpyji/HelpyJiChat";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExtraCreditsSection } from "@/components/settings/ExtraCreditsSection";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAiGate } from "@/hooks/useAiGate";
import { useFreeTrialLiveEndsIn } from "@/hooks/useFreeTrialLiveEndsIn";
import { clampAutopayMonths, DEFAULT_AUTOPAY_MONTHS } from "@/lib/autopayMonths";
import {
  formatWelcomeVoiceTimeLeft,
  FREE_TRIAL_VOICE_CAP_SECONDS,
} from "@/lib/freeTrial";
import { SITE_NAME } from "@/lib/seo-metadata";
import type { PrepBrainUsagePayload } from "@/lib/prepbrainTokens";
import { getTierConfig, TIERS } from "@/lib/subscriptionTiers";
import { isHelpyJiEligibleForTier } from "@/lib/helpyjiVisibility";
import { useAuthStore } from "@/store/useAuthStore";

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
      return "Trial (2-day)";
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

function nextResetDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return format(next, "d MMM yyyy");
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
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const atLimit = limit > 0 && used >= limit;

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
          {used} / {limit}
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
    hasHadTrial,
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
  const helpyjiUpgradeAnchorRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);

  const showHelpyJiMyPlan = !!user && isHelpyJiEligibleForTier(tier, hasPaidAccess);

  const tierConfig = getTierConfig(tier);

  const canCancel = status === "trial" || status === "active";
  const isCancelled = status === "cancelled";
  const isCancelledWithAccess = isCancelled && hasPaidAccess;
  const noActivePlan =
    !status || status === "expired" || (isCancelled && !hasPaidAccess);

  const onWelcomeTrial = freeTrialActive && !hasPaidAccess;

  const welcomeEndsIn = useFreeTrialLiveEndsIn(freeTrialEndsAtIso, onWelcomeTrial);

  useEffect(() => {
    if (!user?.id || loading) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/prepbrain/usage");
        const data = (await res.json()) as {
          ok?: boolean;
          usage?: PrepBrainUsagePayload;
        };
        if (cancelled) return;
        if (data.ok && data.usage) {
          setPrepbrainUsage(data.usage);
        } else {
          setPrepbrainUsage(null);
        }
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
    voiceMinutesUsed,
    trialVoiceSecondsUsed,
  ]);

  const startResubscribe = useCallback(async () => {
    setResubBusy(true);
    setResubError(null);
    try {
      const created = hasHadTrial
        ? await createRazorpayMonthlySubscription("pro", autopayMonths)
        : await createRazorpayTrialSubscription("pro", autopayMonths);
      if (!created.ok) {
        setResubError(created.error);
        return;
      }
      if (typeof window === "undefined" || !window.Razorpay) {
        setResubError("Unable to load payment window. Refresh and try again.");
        return;
      }
      const tc = TIERS.pro;
      const description = hasHadTrial
        ? `${tc.name} (${tc.monthlyPriceDisplay}/mo) · AutoPay up to ${autopayMonths} monthly charge${autopayMonths === 1 ? "" : "s"}`
        : `${tc.name} 2-day trial (${tc.trialPriceDisplay}) · then ${tc.monthlyPriceDisplay}/mo · AutoPay up to ${autopayMonths} monthly charge${autopayMonths === 1 ? "" : "s"}`;
      const rzp = new window.Razorpay({
        key: created.keyId,
        name: SITE_NAME,
        description,
        subscription_id: created.subscriptionId,
        amount: created.amountPaise,
        currency: "INR",
        theme: { color: "#FF7A00" },
        handler: async (response: RazorpayCheckoutResponse) => {
          const updated = hasHadTrial
            ? await activateRazorpayMonthlySubscription({ ...response })
            : await activateRazorpaySubscription({ ...response });
          if (!updated.ok) {
            setResubError(updated.error);
            return;
          }
          window.location.assign("/");
        },
      });
      rzp.open();
    } catch (e) {
      setResubError(e instanceof Error ? e.message : "Checkout failed.");
    } finally {
      setResubBusy(false);
    }
  }, [autopayMonths, hasHadTrial]);

  function handleCancel() {
    setConfirmOpen(false);
    startTransition(async () => {
      setMessage(null);
      const res = await cancelSubscription();
      if (!res.ok) {
        setMessage(res.error);
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
      label: "Plan",
      value:
        plan === "monthly"
          ? `${tierConfig.monthlyPriceDisplay}/month · cancel anytime`
          : plan === "trial"
            ? `${tierConfig.trialPriceDisplay} Trial`
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
    {(isCancelledWithAccess || welcomeTrialExpiredNoPay) && (
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
        <h1 className="kal-feature-title mt-1">My Plan</h1>
        <p className="mt-1 text-sm leading-relaxed text-kal-text-secondary">
          Monthly subscription — you are charged once per month. AutoPay is limited to the number of
          months you chose at signup (shown below when available). Cancel anytime; you keep access
          through the period you already paid for.
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
                  1-day welcome trial
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
                  Voice and PrepBrain limits do not roll over — use them within this window. After it
                  ends, start a 2-day paid trial for {TIERS.pro.trialPriceDisplay}, then{" "}
                  {TIERS.pro.monthlyPriceDisplay}/month for full Pro access.
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
                  label="PrepBrain AI tokens (welcome)"
                  used={prepbrainUsage.used}
                  limit={prepbrainUsage.limit}
                />
              ) : null}
            </div>
          ) : null}

          {welcomeTrialExpiredNoPay && !hasPaidAccess ? (
            <div className="kal-glass-panel rounded-2xl border border-kal-accent/30 bg-kal-accent-soft/40 px-5 py-5 dark:bg-kal-accent/10">
              <h3 className="text-base font-bold text-kal-text">Free trial ended</h3>
              <p className="mt-2 text-sm text-kal-text-secondary">
                Your 1-day welcome access is over. Unlock a 2-day paid trial for{" "}
                <span className="font-semibold text-kal-text">{TIERS.pro.trialPriceDisplay}</span> — then{" "}
                {TIERS.pro.monthlyPriceDisplay}/month. Cancel anytime.
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
                  "Start 2-day paid trial"
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
                  Current plan
                </p>
                <h2 className="mt-1.5 text-xl font-bold text-kal-text sm:text-2xl">
                  {onWelcomeTrial
                    ? "Welcome trial (no charge)"
                    : noActivePlan
                      ? "No active plan"
                      : tierConfig.name}
                </h2>
                <p className="mt-1 text-sm text-kal-text-secondary">
                  {onWelcomeTrial
                    ? "You're on a one-time 1-day preview with limited voice and PrepBrain AI. Subscribe anytime for full access."
                    : noActivePlan
                      ? `Choose a plan to unlock ${SITE_NAME}.`
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
                      {plan === "trial"
                        ? `${tierConfig.trialPriceDisplay} trial`
                        : tierConfig.monthlyPriceDisplay}
                      {plan !== "trial" ? "/month" : ""}
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
                Plan &amp; dates
              </h3>
            </div>

            {rows.map((row) => (
              <div
                key={row.label}
                className="flex min-h-[48px] items-center justify-between border-b border-kal-border px-4 py-3 last:border-b-0"
              >
                <span className="text-sm text-kal-text-secondary">{row.label}</span>
                <span
                  className={`text-sm font-medium ${row.className ?? "text-kal-text"}`}
                >
                  {row.value}
                </span>
              </div>
            ))}

            {hasAiAccess && hasPaidAccess && (
              <div className="border-t border-kal-border">
                <div className="border-b border-kal-border px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-kal-muted">
                    AI usage {status === "trial" ? "(paid trial)" : "(monthly)"}
                  </h3>
                </div>

                {status === "trial" ? (
                  <p className="border-b border-kal-border px-4 py-2 text-xs leading-relaxed text-kal-text-secondary">
                    <span className="font-medium text-kal-text">
                      {TIERS.pro.voiceMinutesPerMonth} voice minutes per month
                    </span>{" "}
                    after your first monthly charge — during this 2-day trial you have{" "}
                    <span className="font-medium text-kal-text">
                      {TIERS.pro.trialVoiceMinutesLimit} minutes
                    </span>{" "}
                    for voice dictation.
                  </p>
                ) : null}

                <UsageBar
                  icon={<Mic className="h-4 w-4" />}
                  label="Voice minutes"
                  used={voiceMinutesUsed}
                  limit={monthlyVoiceMinuteLimit}
                />
                {prepbrainUsage &&
                (prepbrainUsage.phase === "paid_trial" || prepbrainUsage.phase === "monthly") ? (
                  <TokenUsageBar
                    icon={<Brain className="h-4 w-4" />}
                    label={
                      prepbrainUsage.phase === "paid_trial"
                        ? "PrepBrain AI tokens (paid trial)"
                        : "PrepBrain AI tokens (monthly)"
                    }
                    used={prepbrainUsage.used}
                    limit={prepbrainUsage.limit}
                  />
                ) : null}
                {bonusVoiceMinutesRemaining > 0 && (
                  <div className="space-y-2 border-t border-kal-border px-4 py-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                      Bonus credits
                    </p>
                    {bonusVoiceMinutesRemaining > 0 ? (
                      <p className="text-xs text-kal-text-secondary">
                        <span className="font-medium text-kal-text">Voice minutes: </span>
                        {bonusVoiceMinutesRemaining} remaining
                        {bonusVoiceMinutesNextExpiry ? (
                          <> · expires {formatDate(bonusVoiceMinutesNextExpiry)}</>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                )}
                <div className="border-t border-kal-border px-4 py-2">
                  <p className="text-[0.65rem] leading-relaxed text-kal-text-secondary">
                    Bonus voice credits are used before your plan allowance. Combined voice capacity
                    this month: {voiceMinutesLimit} minutes.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-kal-border px-4 py-2">
                  <span className="text-xs text-kal-text-secondary">
                    Usage resets (calendar month)
                  </span>
                  <span className="text-xs font-medium text-kal-text">{nextResetDate()}</span>
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
                        Resubscribe to {tierConfig.name} —{" "}
                        {hasHadTrial
                          ? `${TIERS.pro.monthlyPriceDisplay}/month`
                          : `${TIERS.pro.trialPriceDisplay} trial`}
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

          {showHelpyJiMyPlan ? (
            <>
              <div
                ref={helpyjiUpgradeAnchorRef}
                className="h-px w-full max-w-lg md:max-w-xl"
                aria-hidden
              />
              <HelpyJiChat surface="pricing" intersectionAnchorRef={helpyjiUpgradeAnchorRef} />
            </>
          ) : null}

          {hasAiAccess && hasPaidAccess && <ExtraCreditsSection />}
        </>
      )}
    </div>
    </>
  );
}
