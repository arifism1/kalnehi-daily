"use client";

import Script from "next/script";
import { Bot, Loader2, Star } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  createExtraCreditsOrder,
  verifyExtraCreditsPayment,
} from "@/actions/subscription";
import { PaymentErrorMailButton } from "@/components/subscription/PaymentErrorMailButton";
import { SITE_NAME } from "@/lib/seo-metadata";
import type { PaymentErrorProof } from "@/lib/paymentSupportEmail";
import { AI_STUDY_PARTNER_PACK } from "@/lib/subscriptionTiers";
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

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful purchase so the parent can re-fetch the balance. */
  onPurchased: () => void;
};

export function AiStudyPartnerPurchaseModal({ open, onClose, onPurchased }: Props) {
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

  // Reset error when modal opens/closes
  useEffect(() => {
    if (!open) setPayError(null);
  }, [open]);

  const openCheckout = useCallback(() => {
    startTransition(async () => {
      setPayError(null);
      const created = await createExtraCreditsOrder(AI_STUDY_PARTNER_PACK.id);
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
        description: AI_STUDY_PARTNER_PACK.label,
        order_id: created.orderId,
        theme: { color: "#ef4444" },
        prefill: created.prefill,
        ...(created.prefill.contact
          ? { readonly: { email: true, contact: true } }
          : { readonly: { email: true } }),
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
          setToast("AI Study Partner — 30 hours added to your account!");
          onPurchased();
          onClose();
        },
      });
      rzp.open();
    });
  }, [onClose, onPurchased]);

  if (!open) return null;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 sm:items-center"
        onClick={onClose}
      >
        <div
          className="kal-glass-panel w-full max-w-sm overflow-hidden rounded-t-2xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-kal-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 shrink-0 text-kal-accent" aria-hidden />
              <h2 className="text-sm font-semibold text-kal-text">AI Study Partner</h2>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-kal-accent/10 px-2 py-0.5 text-[10px] font-semibold text-kal-accent">
                <Star className="h-2.5 w-2.5" aria-hidden />
                Popular
              </span>
            </div>
            <p className="mt-1 text-xs text-kal-text-secondary">
              Your AI coach watches you throughout your study time and gives gentle voice
              feedback to keep you on track.
            </p>
          </div>

          {/* Pack details */}
          <div className="px-5 py-4">
            <div className="kal-glass-subtle flex items-center justify-between gap-4 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-kal-text">Study with an AI partner for 30 hours and reduce executive dysfunction</p>
                <p className="mt-0.5 text-xs text-kal-text-secondary">
                  Non-expiring · deducted only when you use it
                </p>
              </div>
              <p className="shrink-0 text-lg font-bold text-kal-accent">₹799</p>
            </div>
          </div>

          {/* Error */}
          {payError ? (
            <div className="px-5 pb-3">
              <p className="text-xs text-kal-danger-text" role="status">
                {payError.text}
              </p>
              <PaymentErrorMailButton
                flow="AI Study Partner — purchase"
                error={payError.text}
                userEmail={userEmail}
                proof={payError.proof}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-kal-danger-border bg-kal-card px-3 py-1.5 text-xs font-semibold text-kal-danger-text underline-offset-2 hover:underline"
              />
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex gap-2 border-t border-kal-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="kal-glass-subtle flex-1 rounded-xl py-2.5 text-sm font-medium text-kal-text-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={openCheckout}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-kal-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Buy for ₹799
            </button>
          </div>
        </div>
      </div>

      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-[95] max-w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-950 shadow-lg dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-50"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
