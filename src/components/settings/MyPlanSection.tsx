"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelSubscription } from "@/actions/subscription";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

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
    case "expired":
      return "text-[var(--kal-danger-text)]";
    default:
      return "text-kal-text-secondary";
  }
}

export function MyPlanSection() {
  const router = useRouter();
  const { loading, status, plan, startDate, endDate } = useSubscriptionAccess();
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

  const canCancel = status === "trial" || status === "active";

  function handleCancel() {
    setConfirmOpen(false);
    startTransition(async () => {
      setMessage(null);
      const res = await cancelSubscription();
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setMessage("Subscription cancelled. No further charges will occur.");
      router.refresh();
    });
  }

  const rows: { label: string; value: string; className?: string }[] = [
    { label: "Status", value: statusLabel(status), className: statusColor(status) },
  ];

  if (status && status !== "expired" && status !== "cancelled") {
    rows.push({
      label: "Plan",
      value: plan === "monthly" ? "₹299/month (12 months)" : plan === "trial" ? "₹21 Trial" : plan ?? "—",
    });
  }

  if (startDate) {
    rows.push({ label: "Started", value: formatDate(startDate) });
  }

  if (endDate && (status === "trial" || status === "active")) {
    rows.push({
      label: status === "trial" ? "Trial ends" : "Current cycle ends",
      value: formatDate(endDate),
    });
  }

  return (
    <div className="overflow-hidden rounded-[1rem] border border-kal-border bg-kal-card kal-shadow-card">
      <ConfirmDialog
        open={confirmOpen}
        title="Cancel subscription?"
        description={
          status === "trial"
            ? "Your trial will end immediately and the upcoming ₹299 monthly charge will not occur. You will lose access to all Pro features."
            : "Your subscription will be cancelled immediately. You will lose access to all Pro features at the end of the current billing cycle."
        }
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
          <span className={`text-sm font-medium ${row.className ?? "text-kal-text"}`}>
            {row.value}
          </span>
        </div>
      ))}

      {canCancel ? (
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
            ) : (
              status === "trial" ? "Cancel Trial" : "Cancel Subscription"
            )}
          </button>
          {message ? (
            <p className="mt-2 text-xs text-kal-text-secondary" role="status">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}

      {!status || status === "expired" || status === "cancelled" ? (
        <div className="border-t border-kal-border px-4 py-3">
          <a
            href="/pricing"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-kal-accent px-4 py-2.5 text-sm font-semibold text-kal-accent-foreground"
          >
            Subscribe to Pro
          </a>
        </div>
      ) : null}
    </div>
  );
}
