import Razorpay from "razorpay";

import { RAZORPAY_PAYMENT_OR_SUB_ID_RE } from "@/lib/razorpayIds";

function looksLikeRazorpaySubscriptionId(id: string): boolean {
  const t = id.trim();
  if (t.length < 12 || t.length > 48) return false;
  if (/^sub_[A-Za-z0-9]+$/.test(t)) return true;
  return RAZORPAY_PAYMENT_OR_SUB_ID_RE.test(t);
}

function cancelErrorLooksBenign(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /already\s*cancel|subscription\s+already\s+cancel|inactive|invalid\s*subscription|not\s+found|does\s+not\s+exist/.test(
      m,
    ) || /nothing\s+to\s+cancel/.test(m)
  );
}

/**
 * Stops monthly AutoPay before activating annual / 6-month upfront access so Razorpay does not
 * debit the next monthly cycle after the user paid upfront.
 *
 * @returns `cancelled: false` when there was no subscription id to cancel.
 */
export async function cancelRazorpayMonthlyBeforeUpfrontPlan(
  razorpay: InstanceType<typeof Razorpay>,
  subscriptionIdRaw: string | null | undefined,
): Promise<{ ok: true; cancelled: boolean } | { ok: false; error: string }> {
  const subId = subscriptionIdRaw?.trim() ?? "";
  if (!subId) {
    return { ok: true, cancelled: false };
  }
  if (!looksLikeRazorpaySubscriptionId(subId)) {
    return {
      ok: false,
      error:
        "Could not verify your monthly AutoPay reference. Please contact support before retrying.",
    };
  }

  const backoffMs = [0, 400, 1200] as const;
  let lastMessage = "";

  for (const wait of backoffMs) {
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    try {
      await razorpay.subscriptions.cancel(subId, false);
      return { ok: true, cancelled: true };
    } catch (e) {
      lastMessage = e instanceof Error ? e.message : String(e);
      if (cancelErrorLooksBenign(lastMessage)) {
        return { ok: true, cancelled: true };
      }
    }
  }

  return {
    ok: false,
    error:
      "Your payment succeeded, but we could not stop monthly AutoPay yet. Please retry in a minute or contact support — we will not double-charge you once AutoPay is cancelled.",
  };
}
