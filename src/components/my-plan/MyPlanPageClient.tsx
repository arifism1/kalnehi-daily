"use client";

import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import { ArrowLeft, Camera, Crown, Loader2, Mic, Sparkles, Zap } from "lucide-react";
import { useState, useTransition } from "react";

import { cancelSubscription } from "@/actions/subscription";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExtraCreditsSection } from "@/components/settings/ExtraCreditsSection";
import { PlanUpgradeSection } from "@/components/settings/PlanUpgradeSection";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAiGate } from "@/hooks/useAiGate";
import { SITE_NAME } from "@/lib/seo-metadata";
import { getTierConfig, type SubscriptionTier } from "@/lib/subscriptionTiers";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "d MMM yyyy");
}

function statusLabel(status: string | null): string {
  switch (status) {
    case "trial":
      return "Trial (3-day)";
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

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  basic: <Zap className="h-6 w-6" strokeWidth={2.25} />,
  pro: <Crown className="h-6 w-6" strokeWidth={2.25} />,
  pro_max: <Sparkles className="h-6 w-6" strokeWidth={2.25} />,
};

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

export function MyPlanPageClient() {
  const {
    loading,
    status,
    hasPaidAccess,
    tier,
    plan,
    startDate,
    endDate,
    refetch,
  } = useSubscriptionAccess();
  const {
    hasAiAccess,
    photoScansUsed,
    photoScansLimit,
    voiceMinutesUsed,
    voiceMinutesLimit,
    monthlyPhotoScanLimit,
    monthlyVoiceMinuteLimit,
    bonusPhotoScansRemaining,
    bonusVoiceMinutesRemaining,
    bonusPhotoScansNextExpiry,
    bonusVoiceMinutesNextExpiry,
  } = useAiGate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tierConfig = getTierConfig(tier);
  const resolvedTier: SubscriptionTier =
    tier === "basic" || tier === "pro" || tier === "pro_max" ? tier : "pro";
  const canCancel = status === "trial" || status === "active";
  const isCancelled = status === "cancelled";
  const noActivePlan =
    !status || status === "expired" || (isCancelled && !hasPaidAccess);

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
      ? `You'll keep full access until ${formatDate(endDate)}. After that, the app will be locked and the upcoming ${tierConfig.monthlyPriceDisplay} monthly charge will not occur.`
      : `You'll keep access until the end of the current billing cycle (${formatDate(endDate)}). After that, you will lose access to all features.`;

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
          ? `${tierConfig.monthlyPriceDisplay}/month (12 months)`
          : plan === "trial"
            ? `${tierConfig.trialPriceDisplay} Trial`
            : (plan ?? "—"),
    });
  }

  if (startDate) {
    rows.push({ label: "Started", value: formatDate(startDate) });
  }

  if (endDate && (status === "trial" || status === "active" || isCancelled)) {
    const label = isCancelled
      ? "Expires on"
      : status === "trial"
        ? "Trial ends"
        : "Current cycle ends";
    rows.push({ label, value: formatDate(endDate) });
  }

  return (
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
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-kal-text">My Plan</h1>
        <p className="mt-1 text-sm leading-relaxed text-kal-text-secondary">
          Your tier, billing, AI usage, upgrades, and extra credits — all in one place.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-kal-accent" />
        </div>
      ) : (
        <>
          {/* Tier spotlight */}
          <div className="overflow-hidden rounded-2xl border border-kal-accent/30 bg-gradient-to-br from-kal-accent-soft/95 via-white/65 to-white/80 shadow-lg backdrop-blur-md dark:from-red-950/45 dark:via-zinc-900/75 dark:to-zinc-900/88 dark:border-red-500/25">
            <div className="flex items-start gap-4 p-5 sm:p-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-kal-accent/15 text-kal-accent">
                {TIER_ICONS[resolvedTier]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                  Current plan
                </p>
                <h2 className="mt-1.5 text-xl font-bold text-kal-text sm:text-2xl">
                  {noActivePlan ? "No active plan" : tierConfig.name}
                </h2>
                <p className="mt-1 text-sm text-kal-text-secondary">
                  {noActivePlan
                    ? `Choose a plan to unlock ${SITE_NAME}.`
                    : tierConfig.tagline}
                </p>
                {hasPaidAccess && !noActivePlan ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status === "trial" || status === "active" ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"}`}
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
                Billing &amp; dates
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
                    AI usage (monthly)
                  </h3>
                </div>
                {status === "trial" && (
                  <p className="border-b border-kal-border px-4 py-2 text-xs text-kal-text-secondary">
                    During trial, lower AI limits apply. After your first paid cycle,
                    full monthly limits apply and trial usage no longer applies.
                  </p>
                )}
                <UsageBar
                  icon={<Camera className="h-4 w-4" />}
                  label="Photo scans"
                  used={photoScansUsed}
                  limit={monthlyPhotoScanLimit}
                />
                <UsageBar
                  icon={<Mic className="h-4 w-4" />}
                  label="Voice minutes"
                  used={voiceMinutesUsed}
                  limit={monthlyVoiceMinuteLimit}
                />
                {(bonusPhotoScansRemaining > 0 || bonusVoiceMinutesRemaining > 0) && (
                  <div className="space-y-2 border-t border-kal-border px-4 py-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                      Bonus credits
                    </p>
                    {bonusPhotoScansRemaining > 0 ? (
                      <p className="text-xs text-kal-text-secondary">
                        <span className="font-medium text-kal-text">Photo scans: </span>
                        {bonusPhotoScansRemaining} remaining
                        {bonusPhotoScansNextExpiry ? (
                          <> · expires {formatDate(bonusPhotoScansNextExpiry)}</>
                        ) : null}
                      </p>
                    ) : null}
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
                    Bonus credits are used before your monthly allowance. Combined
                    capacity this month: {photoScansLimit} scans, {voiceMinutesLimit}{" "}
                    voice minutes.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-kal-border px-4 py-2">
                  <span className="text-xs text-kal-text-secondary">
                    Usage resets (calendar month)
                  </span>
                  <span className="text-xs font-medium text-kal-text">
                    {nextResetDate()}
                  </span>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="border-t border-kal-border bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                  Subscription is cancelled and will expire on {formatDate(endDate)}.
                  You will not be charged further.
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

          {hasPaidAccess && <PlanUpgradeSection />}

          {hasAiAccess && hasPaidAccess && <ExtraCreditsSection />}
        </>
      )}
    </div>
  );
}
