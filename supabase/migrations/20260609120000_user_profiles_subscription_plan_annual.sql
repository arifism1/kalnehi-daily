-- Allow 'annual' for one-time annual Smart Plan checkouts (see /api/annual-plan/verify).
-- Previously only NULL | 'trial' | 'monthly' was allowed, causing 23514 on update.

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_plan_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_plan_check
  CHECK (
    subscription_plan IS NULL
    OR subscription_plan IN ('trial', 'monthly', 'annual')
  );

COMMENT ON CONSTRAINT user_profiles_subscription_plan_check ON public.user_profiles IS
  'Valid plan keys: trial (Razorpay or legacy), monthly (recurring), annual (one-time order).';
