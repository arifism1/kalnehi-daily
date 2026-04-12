/**
 * Razorpay payment and subscription reference ids (legacy server rule).
 * Shared so webhooks and server actions validate the same strings.
 */
export const RAZORPAY_PAYMENT_OR_SUB_ID_RE = /^[a-zA-Z0-9_]{14,30}$/;
