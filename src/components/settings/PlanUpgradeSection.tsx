"use client";

import Script from "next/script";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  confirmPlanUpgradeSubscriptionAuth,
  createPlanUpgradeOrder,
  getPlanUpgradeQuotes,
  getSubscriptionMandateCheckoutCredentials,
  verifyPlanUpgradePayment,
  type PlanUpgradeQuote,
} from "@/actions/subscription";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { TIERS, type SubscriptionTier } from "@/lib/subscriptionTiers";

type RazorpayOrderHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpaySubscriptionHandlerResponse = {
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

type PendingMandate = {
  keyId: string;
  subscriptionId: string;
  targetTier: SubscriptionTier;
  tierName: string;
};

export function PlanUpgradeSection() {
  const { refetch } = useSubscriptionAccess();
  const [quotes, setQuotes] = useState<PlanUpgradeQuote[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pendingMandate, setPendingMandate] = useState<PendingMandate | null>(null);
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

  const openMandateCheckout = useCallback(
    (m: PendingMandate) => {
      if (typeof window === "undefined" || !window.Razorpay) {
        setMessage("Unable to load payment window. Refresh and try again.");
        setBusyId(null);
        return false;
      }
      const monthlyPaise = TIERS[m.targetTier].monthlyPricePaise;
      const rzpSub = new window.Razorpay({
        key: m.keyId,
        name: "Kalnehi Daily",
        description: `${m.tierName} — authorize monthly recurring billing (UPI auto-pay)`,
        subscription_id: m.subscriptionId,
        amount: monthlyPaise,
        currency: "INR",
        theme: { color: "#ef4444" },
        modal: {
          ondismiss: () => {
            setBusyId(null);
            setPendingMandate(m);
          },
        },
        handler: async (subRes: RazorpaySubscriptionHandlerResponse) => {
          const c = await confirmPlanUpgradeSubscriptionAuth({
            razorpay_payment_id: subRes.razorpay_payment_id,
            razorpay_subscription_id: subRes.razorpay_subscription_id,
            razorpay_signature: subRes.razorpay_signature,
          });
          setBusyId(null);
          setPendingMandate(null);
          if (!c.ok) {
            setMessage(c.error);
            return;
          }
          setMessage(
            `${m.tierName} is active. Monthly billing and auto-pay are set for the next renewal.`,
          );
          refetch();
          reloadQuotes();
        },
      });
      rzpSub.open();
      return true;
    },
    [refetch, reloadQuotes],
  );

  const resumeMandateFromServer = useCallback(() => {
    startTransition(async () => {
      setMessage(null);
      const creds = await getSubscriptionMandateCheckoutCredentials();
      if (!creds.ok) {
        setMessage(creds.error);
        return;
      }
      setBusyId(creds.tier);
      const m: PendingMandate = {
        keyId: creds.keyId,
        subscriptionId: creds.subscriptionId,
        targetTier: creds.tier,
        tierName: TIERS[creds.tier].name,
      };
      openMandateCheckout(m);
    });
  }, [openMandateCheckout]);

  const onUpgrade = useCallback(
    (q: PlanUpgradeQuote) => {
      setMessage(null);
      setWarning(null);
      setPendingMandate(null);
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
            if (!v.ok) {
              setBusyId(null);
              setMessage(v.error);
              return;
            }

            if ("keyId" in v && "subscriptionId" in v) {
              if (v.warning) setWarning(v.warning);
              const mandate: PendingMandate = {
                keyId: v.keyId,
                subscriptionId: v.subscriptionId,
                targetTier: q.targetTier,
                tierName,
              };
              if (!openMandateCheckout(mandate)) {
                setBusyId(null);
                setMessage(
                  "Prorated payment succeeded. Use “Resume monthly authorization” below after checkout loads.",
                );
                setPendingMandate(mandate);
                refetch();
                reloadQuotes();
                return;
              }
              return;
            }

            setBusyId(null);
            setMessage(`${tierName} is active now. Your new subscription renews after the current period.`);
            refetch();
            reloadQuotes();
          },
        });
        rzp.open();
      });
    },
    [openMandateCheckout, refetch, reloadQuotes],
  );

  const resumePendingMandate = useCallback(() => {
    if (!pendingMandate) return;
    setMessage(null);
    setBusyId(pendingMandate.targetTier);
    openMandateCheckout(pendingMandate);
  }, [pendingMandate, openMandateCheckout]);

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
        {(pendingMandate || quotes.length > 0) && (
          <div className="flex flex-wrap gap-2 border-t border-kal-border px-3 py-2">
            {pendingMandate ? (
              <button
                type="button"
                disabled={Boolean(busyId) || isPending}
                onClick={resumePendingMandate}
                className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-kal-border bg-kal-glass-subtle px-3 text-xs font-semibold text-kal-text disabled:opacity-50"
              >
                Continue monthly authorization
              </button>
            ) : null}
            <button
              type="button"
              disabled={Boolean(busyId) || isPending}
              onClick={resumeMandateFromServer}
              className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-kal-border bg-kal-glass-subtle px-3 text-xs font-semibold text-kal-text-secondary disabled:opacity-50"
            >
              Resume monthly authorization (after refresh)
            </button>
          </div>
        )}
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
