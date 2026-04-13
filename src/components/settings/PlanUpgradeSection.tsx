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
import { PaymentErrorMailButton } from "@/components/subscription/PaymentErrorMailButton";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import type { PaymentErrorProof } from "@/lib/paymentSupportEmail";
import { SITE_NAME } from "@/lib/seo-metadata";
import { TIERS } from "@/lib/subscriptionTiers";
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

export function PlanUpgradeSection() {
  const { refetch } = useSubscriptionAccess();
  const userEmail = useAuthStore((s) => s.user?.email ?? null);
  const [quotes, setQuotes] = useState<PlanUpgradeQuote[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [payError, setPayError] = useState<{
    text: string;
    proof?: PaymentErrorProof;
  } | null>(null);
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
      setSuccessMessage(null);
      setPayError(null);
      setWarning(null);
      setBusyId(q.targetTier);
      startTransition(async () => {
        const created = await createPlanUpgradeOrder(q.targetTier);
        if (!created.ok) {
          setPayError({ text: created.error });
          setBusyId(null);
          return;
        }

        if (typeof window === "undefined" || !window.Razorpay) {
          setPayError({
            text: "Unable to load payment window. Refresh and try again.",
          });
          setBusyId(null);
          return;
        }

        const tierName = TIERS[q.targetTier].name;
        const rzp = new window.Razorpay({
          key: created.keyId,
          name: SITE_NAME,
          description: `${tierName} — proration now, then ${TIERS[q.targetTier].monthlyPriceDisplay}/mo. AutoPay keeps your remaining monthly cycles (not a new 12-mo mandate).`,
          subscription_id: created.subscriptionId,
          theme: { color: "#ef4444" },
          modal: {
            ondismiss: () => setBusyId(null),
          },
          handler: async (response: RazorpayCheckoutResponse) => {
            const v = await verifyPlanUpgradePayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });
            setBusyId(null);
            if (!v.ok) {
              setPayError({
                text: v.error,
                proof: {
                  paymentId: response.razorpay_payment_id,
                  subscriptionId: response.razorpay_subscription_id,
                },
              });
              return;
            }
            if (v.warning) setWarning(v.warning);
            setSuccessMessage(
              `${tierName} is now active. You paid the prorated amount for the rest of this month. AutoPay continues with your remaining monthly cycles (unchanged cap). Next cycle onward: ${TIERS[q.targetTier].monthlyPriceDisplay}/month. You can cancel anytime.`,
            );
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
        <p role="status">{loadError}</p>
        <PaymentErrorMailButton
          flow="My Plan — load upgrade quotes"
          error={loadError}
          userEmail={userEmail}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-kal-border bg-kal-card px-3 py-1.5 text-xs font-semibold text-kal-accent underline-offset-2 hover:underline"
        />
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
            Pay only the prorated amount now for the rest of this month — your higher limits
            apply immediately. Your new subscription keeps the{" "}
            <span className="font-semibold text-kal-text">same number of remaining monthly AutoPay</span>{" "}
            cycles as your current plan (not reset to a new long mandate). From the next cycle
            you are charged the new monthly price. You can cancel anytime.
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
        {payError ? (
          <div className="border-t border-kal-border bg-rose-50 px-4 py-2.5 dark:bg-rose-950/25">
            <p className="text-xs font-medium text-rose-900 dark:text-rose-200" role="status">
              {payError.text}
            </p>
            <PaymentErrorMailButton
              flow="My Plan — upgrade checkout"
              error={payError.text}
              userEmail={userEmail}
              proof={payError.proof}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 underline-offset-2 hover:underline dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
            />
          </div>
        ) : null}
        {successMessage ? (
          <div className="border-t border-kal-border bg-emerald-50 px-4 py-2.5 dark:bg-emerald-950/25">
            <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200" role="status">
              {successMessage}
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
