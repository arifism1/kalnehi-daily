"use client";

import { Mail } from "lucide-react";

import {
  buildPaymentSupportMailto,
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
 * Opens the user's mail client with a pre-filled message to support, including
 * error context and any Razorpay ids available from the failed checkout step.
 */
export function PaymentErrorMailButton({
  flow,
  error,
  userEmail,
  proof,
  className,
}: Props) {
  const href = buildPaymentSupportMailto({ flow, error, userEmail, proof });
  return (
    <a
      href={href}
      className={
        className ??
        "mt-2 inline-flex items-center gap-1.5 rounded-lg border border-kal-border bg-kal-card px-3 py-1.5 text-xs font-semibold text-kal-accent underline-offset-2 hover:underline"
      }
    >
      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Email proof to support
    </a>
  );
}
