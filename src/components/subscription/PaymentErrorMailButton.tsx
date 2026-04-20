"use client";

import { LifeBuoy } from "lucide-react";

import { useContactSupport } from "@/components/support/ContactSupportProvider";
import {
  buildPaymentSupportMessage,
  type PaymentErrorProof,
} from "@/lib/paymentSupportEmail";

type Props = {
  flow: string;
  error: string;
  userEmail?: string | null;
  proof?: PaymentErrorProof;
  className?: string;
};

/**
 * Opens the in-app Resend contact form with billing subject and payment context
 * (error text, optional Razorpay ids).
 */
export function PaymentErrorMailButton({
  flow,
  error,
  userEmail,
  proof,
  className,
}: Props) {
  const { openContactSupport } = useContactSupport();

  return (
    <button
      type="button"
      onClick={() => {
        openContactSupport({
          subject: "billing_issue",
          message: buildPaymentSupportMessage({
            flow,
            error,
            userEmail,
            proof,
          }),
        });
      }}
      className={
        className ??
        "mt-2 inline-flex items-center gap-1.5 rounded-lg border border-kal-border bg-kal-card px-3 py-1.5 text-xs font-semibold text-kal-accent underline-offset-2 hover:underline"
      }
    >
      <LifeBuoy className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Contact support
    </button>
  );
}
