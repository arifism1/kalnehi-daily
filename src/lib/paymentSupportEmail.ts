import { SITE_NAME } from "@/lib/seo-metadata";

export type PaymentErrorProof = {
  paymentId?: string;
  orderId?: string;
  subscriptionId?: string;
};

/**
 * Plain-text message for the contact form when the user had a payment/checkout issue.
 * Keep in sync with support / billing triage on the Resend `CONTACT_SUPPORT_TO` side.
 */
export function buildPaymentSupportMessage(opts: {
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

  return lines.join("\n");
}
