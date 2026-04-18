"use client";

import Script from "next/script";
import { Brain, Loader2, Mic, Plus } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  createExtraCreditsOrder,
  verifyExtraCreditsPayment,
} from "@/actions/subscription";
import { PaymentErrorMailButton } from "@/components/subscription/PaymentErrorMailButton";
import { SITE_NAME } from "@/lib/seo-metadata";
import type { PaymentErrorProof } from "@/lib/paymentSupportEmail";
import { EXTRA_CREDIT_PACKS_UI, type ExtraCreditPack } from "@/lib/subscriptionTiers";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAuthStore } from "@/store/useAuthStore";

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

function CreditCard({
  pack,
  onBuy,
  disabled,
}: {
  pack: ExtraCreditPack;
  onBuy: (pack: ExtraCreditPack) => void;
  disabled: boolean;
}) {
  const Icon = pack.type === "ai_tokens" ? Brain : Mic;
  return (
    <div className="kal-glass-subtle flex items-center justify-between rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-kal-accent" aria-hidden />
        <div>
          <p className="text-sm font-medium text-kal-text">{pack.label}</p>
          <p className="text-xs text-kal-text-secondary">{pack.priceDisplay}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onBuy(pack)}
        className="kal-glass-subtle inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-kal-text disabled:opacity-50"
      >
        <Plus className="h-3 w-3" />
        Buy
      </button>
    </div>
  );
}

export function ExtraCreditsSection() {
  const { refetch } = useSubscriptionAccess();
  const userEmail = useAuthStore((s) => s.user?.email ?? null);
  const [isPending, startTransition] = useTransition();
  const [payError, setPayError] = useState<{
    text: string;
    proof?: PaymentErrorProof;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const openCheckout = useCallback(
    (pack: ExtraCreditPack) => {
      startTransition(async () => {
        setPayError(null);
        const created = await createExtraCreditsOrder(pack.id);
        if (!created.ok) {
          setPayError({ text: created.error });
          return;
        }

        if (typeof window === "undefined" || !window.Razorpay) {
          setPayError({
            text: "Unable to load payment window. Refresh and try again.",
          });
          return;
        }

        const rzp = new window.Razorpay({
          key: created.keyId,
          amount: created.amountPaise,
          currency: "INR",
          name: SITE_NAME,
          description: pack.label,
          order_id: created.orderId,
          theme: { color: "#ef4444" },
          handler: async (response: RazorpayOrderHandlerResponse) => {
            const v = await verifyExtraCreditsPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (!v.ok) {
              setPayError({
                text: v.error,
                proof: {
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                },
              });
              return;
            }
            setPayError(null);
            setToast(`${pack.label} added — valid for 30 days from purchase.`);
            refetch();
          },
        });
        rzp.open();
      });
    },
    [refetch],
  );

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <div className="kal-glass-panel overflow-hidden rounded-[1rem]">
        <div className="border-b border-kal-border px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-kal-accent">
            Buy Extra AI Credits
          </h3>
          <p className="mt-1 text-xs text-kal-text-secondary">
            One-time Razorpay checkout. Bonus credits apply for 30 days from
            purchase (used before your monthly quota) and expire if unused.
          </p>
        </div>
        <div className="space-y-2 p-3">
          {EXTRA_CREDIT_PACKS_UI.map((pack) => (
            <CreditCard
              key={pack.id}
              pack={pack}
              onBuy={openCheckout}
              disabled={isPending}
            />
          ))}
        </div>
        {isPending && (
          <div className="flex justify-center border-t border-kal-border py-2">
            <Loader2 className="h-4 w-4 animate-spin text-kal-accent" />
          </div>
        )}
        {payError ? (
          <div className="border-t border-kal-border px-4 py-2">
            <p className="text-xs text-kal-danger-text" role="status">
              {payError.text}
            </p>
            <PaymentErrorMailButton
              flow="My Plan — extra AI credits"
              error={payError.text}
              userEmail={userEmail}
              proof={payError.proof}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-kal-danger-border bg-kal-card px-3 py-1.5 text-xs font-semibold text-kal-danger-text underline-offset-2 hover:underline"
            />
          </div>
        ) : null}
      </div>
      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-[60] max-w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-950 shadow-lg dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-50"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
