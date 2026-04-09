"use client";

import Script from "next/script";
import { Camera, Loader2, Mic, Plus } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import {
  createExtraCreditsOrder,
  verifyExtraCreditsPayment,
} from "@/actions/subscription";
import { EXTRA_CREDIT_PACKS, type ExtraCreditPack } from "@/lib/subscriptionTiers";
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

function CreditCard({
  pack,
  onBuy,
  disabled,
}: {
  pack: ExtraCreditPack;
  onBuy: (pack: ExtraCreditPack) => void;
  disabled: boolean;
}) {
  const isPhoto = pack.type === "photo_scans";

  return (
    <div className="flex items-center justify-between rounded-xl border border-kal-border bg-kal-card px-4 py-3">
      <div className="flex items-center gap-3">
        {isPhoto ? (
          <Camera className="h-4 w-4 text-kal-accent" />
        ) : (
          <Mic className="h-4 w-4 text-kal-accent" />
        )}
        <div>
          <p className="text-sm font-medium text-kal-text">{pack.label}</p>
          <p className="text-xs text-kal-text-secondary">{pack.priceDisplay}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onBuy(pack)}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-kal-border bg-kal-card-muted px-3 text-xs font-semibold text-kal-text disabled:opacity-50"
      >
        <Plus className="h-3 w-3" />
        Buy
      </button>
    </div>
  );
}

export function ExtraCreditsSection() {
  const { refetch } = useSubscriptionAccess();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const openCheckout = useCallback(
    (pack: ExtraCreditPack) => {
      startTransition(async () => {
        setMessage(null);
        const created = await createExtraCreditsOrder(pack.id);
        if (!created.ok) {
          setMessage(created.error);
          return;
        }

        if (typeof window === "undefined" || !window.Razorpay) {
          setMessage("Unable to load payment window. Refresh and try again.");
          return;
        }

        const rzp = new window.Razorpay({
          key: created.keyId,
          amount: created.amountPaise,
          currency: "INR",
          name: "Kalnehi Daily",
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
              setMessage(v.error);
              return;
            }
            setMessage(`${pack.label} added to your account.`);
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
      <div className="overflow-hidden rounded-[1rem] border border-kal-border bg-kal-card kal-shadow-card">
        <div className="border-b border-kal-border px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-kal-accent">
            Buy Extra AI Credits
          </h3>
          <p className="mt-1 text-xs text-kal-text-secondary">
            One-time Razorpay checkout — bonus credits stack with your monthly
            allowance and do not expire.
          </p>
        </div>
        <div className="space-y-2 p-3">
          {EXTRA_CREDIT_PACKS.map((pack) => (
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
        {message && (
          <div className="border-t border-kal-border px-4 py-2">
            <p className="text-xs text-kal-text-secondary" role="status">
              {message}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
