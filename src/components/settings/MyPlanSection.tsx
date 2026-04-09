"use client";

import { format } from "date-fns";
import { Camera, Loader2, Mic } from "lucide-react";
import { useState, useTransition } from "react";

import { cancelSubscription } from "@/actions/subscription";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExtraCreditsSection } from "@/components/settings/ExtraCreditsSection";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAiGate } from "@/hooks/useAiGate";
import { getTierConfig } from "@/lib/subscriptionTiers";

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
      return "text-emerald-600 dark:text-emerald-400";
    case "cancelled":
      return "text-amber-600 dark:text-amber-400";
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
  const atLimit = used >= limit;

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

export function MyPlanSection() {
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
  } = useAiGate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-kal-accent" />
      </div>
    );
  }

  const tierConfig = getTierConfig(tier);
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
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1rem] border border-kal-border bg-kal-card kal-shadow-card">
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
            <UsageBar
              icon={<Camera className="h-4 w-4" />}
              label="Photo Scans"
              used={photoScansUsed}
              limit={photoScansLimit}
            />
            <UsageBar
              icon={<Mic className="h-4 w-4" />}
              label="Voice Minutes"
              used={voiceMinutesUsed}
              limit={voiceMinutesLimit}
            />
            <div className="flex items-center justify-between border-t border-kal-border px-4 py-2">
              <span className="text-xs text-kal-text-secondary">
                Usage resets
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
              Subscription is cancelled and will expire on{" "}
              {formatDate(endDate)}. You will not be charged further.
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

      {hasAiAccess && hasPaidAccess && <ExtraCreditsSection />}
    </div>
  );
}
