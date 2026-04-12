"use client";

import Script from "next/script";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  createPlanUpgradeOrder,
  getPlanUpgradeQuotes,
  verifyPlanUpgradePayment,
  type PlanUpgradeQuote,
} from "@/actions/subscription";
import { TIERS } from "@/lib/subscriptionTiers";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

type RazorpayOrderHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = { open: () => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export function PlanUpgradeSection() {
  const { refetch } = useSubscriptionAccess();
  const [quotes, setQuotes] = useState<PlanUpgradeQuote[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reloadQuotes = useCallback(() => {
    startTransition(async () => {
      setLoadError(null);
      const res = await getPlanUpgradeQuotes();
      if (!res.ok) {
        setLoadError(res.error);
        setQuotes([]);
        return;
      }
      setQuotes(res.quotes);
    });
  }, []);

  useEffect(() => {
    reloadQuotes();
  }, [reloadQuotes]);

  const onUpgrade = useCallback(
    (q: PlanUpgradeQuote) => {
      setMessage(null);
      setWarning(null);
      setBusyId(q.targetTier);
      startTransition(async () => {
        const created = await createPlanUpgradeOrder(q.targetTier);
        if (!created.ok) {
          setMessage(created.error);
          setBusyId(null);
          return;
        }

        if (typeof window === "undefined" || !window.Razorpay) {
          setMessage("Unable to load payment window. Refresh and try again.");
          setBusyId(null);
          return;
        }

        const tierName = TIERS[q.targetTier].name;
        const rzp = new window.Razorpay({
          key: created.keyId,
          amount: created.amountPaise,
          currency: "INR",
          name: "Kalnehi Daily",
          description: `Upgrade to ${tierName} — prorated`,
          order_id: created.orderId,
          theme: { color: "#ef4444" },
          modal: {
            ondismiss: () => setBusyId(null),
          },
          handler: async (response: RazorpayOrderHandlerResponse) => {
            const v = await verifyPlanUpgradePayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setBusyId(null);
            if (!v.ok) {
              setMessage(v.error);
              return;
            }
            setMessage(`${tierName} is active now. Your new subscription renews after the current period.`);
            if ("warning" in v) setWarning(v.warning);
            refetch();
            reloadQuotes();
          },
        });
        rzp.open();
      });
    },
    [refetch, reloadQuotes],
  );

  if (loadError) {
    return (
      <div className="kal-glass-subtle rounded-[1rem] px-4 py-3 text-xs text-kal-text-secondary">
        {loadError}
      </div>
    );
  }

  if (quotes.length === 0 && !isPending) return null;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <div className="kal-glass-panel overflow-hidden rounded-[1rem]">
        <div className="border-b border-kal-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-kal-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade plan
          </h3>
          <p className="mt-1 text-xs text-kal-text-secondary">
            Pay only the prorated difference for the rest of this billing window. Your
            higher tier applies immediately; Razorpay continues billing on the new plan
            from the next cycle.
          </p>
        </div>
        <div className="space-y-2 p-3">
          {quotes.map((q) => (
            <div
              key={q.targetTier}
              className="kal-glass-subtle flex flex-col gap-2 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-kal-text">
                  {TIERS[q.targetTier].name}
                </p>
                <p className="mt-0.5 text-xs font-medium text-kal-accent">{q.line}</p>
              </div>
              <button
                type="button"
                disabled={Boolean(busyId) || isPending}
                onClick={() => onUpgrade(q)}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-lg bg-kal-accent px-4 text-xs font-bold text-kal-accent-foreground disabled:opacity-50"
              >
                {busyId === q.targetTier ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Working…
                  </>
                ) : (
                  "Pay & upgrade"
                )}
              </button>
            </div>
          ))}
        </div>
        {isPending && !quotes.length ? (
          <div className="flex justify-center border-t border-kal-border py-4">
            <Loader2 className="h-5 w-5 animate-spin text-kal-accent" />
          </div>
        ) : null}
        {message ? (
          <div className="border-t border-kal-border bg-emerald-50 px-4 py-2.5 dark:bg-emerald-950/25">
            <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200" role="status">
              {message}
            </p>
          </div>
        ) : null}
        {warning ? (
          <div className="border-t border-kal-border bg-amber-50 px-4 py-2.5 dark:bg-amber-950/25">
            <p className="text-xs text-amber-900 dark:text-amber-200" role="status">
              {warning}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
