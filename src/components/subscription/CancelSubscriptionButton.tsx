"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { cancelSubscription } from "@/actions/subscription";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

type CancelSubscriptionButtonProps = {
  className?: string;
};

export function CancelSubscriptionButton({ className }: CancelSubscriptionButtonProps) {
  const { status, loading, refetch } = useSubscriptionAccess();
  const [message, setMessage] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (loading || (status !== "trial" && status !== "active")) return null;

  if (cancelled) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 dark:bg-emerald-950/25">
        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200" role="status">
          Subscription cancelled. You keep access until your current billing period ends — you will
          not be charged again.
        </p>
      </div>
    );
  }

  const label = status === "trial" ? "Cancel Trial" : "Cancel Subscription";
  const pendingLabel = status === "trial" ? "Cancelling trial..." : "Cancelling...";

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={
          className ??
          "inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--kal-danger-text)] disabled:opacity-60"
        }
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setMessage(null);
            const res = await cancelSubscription();
            if (!res.ok) {
              setMessage(surfaceErrorForUi(res.error));
              return;
            }
            setCancelled(true);
            refetch();
          });
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {pendingLabel}
          </>
        ) : (
          label
        )}
      </button>
      {message ? (
        <p className="text-xs text-[var(--kal-danger-text)]" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
