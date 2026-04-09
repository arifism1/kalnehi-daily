"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelSubscription } from "@/actions/subscription";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

type CancelSubscriptionButtonProps = {
  className?: string;
};

export function CancelSubscriptionButton({ className }: CancelSubscriptionButtonProps) {
  const router = useRouter();
  const { status, loading } = useSubscriptionAccess();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (loading || (status !== "trial" && status !== "active")) return null;

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
              setMessage(res.error);
              return;
            }
            setMessage("Subscription cancelled. No further charges will occur.");
            router.replace("/pricing");
            router.refresh();
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
        <p className="text-xs text-kal-text-secondary" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
