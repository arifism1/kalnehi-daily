-- Subscription state for Razorpay plans.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_status_check,
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_plan_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_status_check
    CHECK (
      subscription_status IS NULL
      OR subscription_status IN ('trial', 'active', 'expired', 'cancelled')
    ),
  ADD CONSTRAINT user_profiles_subscription_plan_check
    CHECK (
      subscription_plan IS NULL
      OR subscription_plan IN ('trial', 'monthly')
    );

COMMENT ON COLUMN public.user_profiles.subscription_status IS
  'Null for never subscribed, trial for introductory plan, active for paid recurring plan, expired when access ended, cancelled when user stops before renewal.';
COMMENT ON COLUMN public.user_profiles.subscription_plan IS
  'Current plan key: trial or monthly.';
COMMENT ON COLUMN public.user_profiles.subscription_start_date IS
  'UTC timestamp when current plan access starts.';
COMMENT ON COLUMN public.user_profiles.subscription_end_date IS
  'UTC timestamp when current plan access ends.';
COMMENT ON COLUMN public.user_profiles.razorpay_subscription_id IS
  'Razorpay subscription identifier for the current cycle.';
