-- Ensure razorpay_processed_payments.kind allows six_month verify + webhook idempotency rows.
-- Replaces the CHECK list so later migrations do not drop newer kind values.

ALTER TABLE public.razorpay_processed_payments
  DROP CONSTRAINT IF EXISTS razorpay_processed_payments_kind_check;

ALTER TABLE public.razorpay_processed_payments
  ADD CONSTRAINT razorpay_processed_payments_kind_check
  CHECK (
    kind IN (
      'extra_credits',
      'plan_upgrade',
      'plan_upgrade_mandate',
      'waitlist_skip',
      'annual_plan',
      'six_month_plan',
      'webhook_charged'
    )
  )
  NOT VALID;
