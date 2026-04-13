import { SITE_NAME } from "@/lib/seo-metadata";

/** Support inbox for payment issues (screenshots / Razorpay IDs). */
export const PAYMENT_SUPPORT_EMAIL = "curioversitylearning@gmail.com";

export type PaymentErrorProof = {
  paymentId?: string;
  orderId?: string;
  subscriptionId?: string;
};

export function buildPaymentSupportMailto(opts: {
  flow: string;
  error: string;
  userEmail?: string | null;
  proof?: PaymentErrorProof;
}): string {
  const proofLines: string[] = [
    "Proof (from Razorpay SMS, email, or dashboard if available):",
    opts.proof?.paymentId
      ? `Payment ID: ${opts.proof.paymentId}`
      : "Payment ID: (paste if you have it)",
  ];
  if (opts.proof?.orderId) {
    proofLines.push(`Order ID: ${opts.proof.orderId}`);
  }
  if (opts.proof?.subscriptionId) {
    proofLines.push(`Subscription ID: ${opts.proof.subscriptionId}`);
  }

  const lines = [
    `App: ${SITE_NAME}`,
    `Flow: ${opts.flow}`,
    `Error shown in app: ${opts.error}`,
    "",
    ...proofLines,
    "",
    opts.userEmail ? `Signed-in account email: ${opts.userEmail}` : "",
    "",
    "Please attach a screenshot of your Razorpay success page, receipt, or bank debit SMS.",
  ].filter((line) => line !== "");

  const subject = encodeURIComponent(`${SITE_NAME} — payment help`);
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:${PAYMENT_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
