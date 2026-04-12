-- Idempotency for confirmPlanUpgradeSubscriptionAuth (mandate payment id)

ALTER TABLE public.razorpay_processed_payments
  DROP CONSTRAINT IF EXISTS razorpay_processed_payments_kind_check;

ALTER TABLE public.razorpay_processed_payments
  ADD CONSTRAINT razorpay_processed_payments_kind_check
  CHECK (kind IN ('extra_credits', 'plan_upgrade', 'plan_upgrade_mandate'));
