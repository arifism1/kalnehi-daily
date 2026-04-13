-- Total monthly billing cycles (Razorpay total_count) chosen or inherited for the current subscription.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_autopay_months_total integer;

COMMENT ON COLUMN public.user_profiles.subscription_autopay_months_total IS
  'Number of monthly plan charges authorized for the current Razorpay subscription (total_count). Null for legacy rows.';
