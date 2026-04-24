-- Add 'six_month' plan value and update pricing in admin_config.
-- Introduces a 6-month upfront plan at ₹2,154 (10% off monthly × 6).
-- Monthly price drops from ₹499 to ₹399; annual price recalculated to ₹3,830 (20% off).

-- Extend the subscription_plan check constraint to allow 'six_month'.
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_plan_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_plan_check
  CHECK (
    subscription_plan IS NULL
    OR subscription_plan IN ('trial', 'monthly', 'six_month', 'annual')
  );

COMMENT ON CONSTRAINT user_profiles_subscription_plan_check ON public.user_profiles IS
  'Valid plan keys: trial (Razorpay or legacy), monthly (recurring), six_month (one-time 6-month order), annual (one-time 12-month order).';

-- Update monthly price from ₹499 to ₹399.
UPDATE public.admin_config
  SET value = '399'
  WHERE key = 'smart_plan_monthly_price_inr';

-- Update annual price from ₹4,790 to ₹3,830 (20% off ₹399 × 12).
UPDATE public.admin_config
  SET value = '3830'
  WHERE key = 'smart_plan_annual_price_inr';

-- Insert the new 6-month semi-annual price (10% off ₹399 × 6 = ₹2,154).
INSERT INTO public.admin_config (key, value)
  VALUES ('smart_plan_semi_annual_price_inr', '2154')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
