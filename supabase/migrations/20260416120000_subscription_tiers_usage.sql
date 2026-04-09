-- 3-tier subscription system: basic / pro / pro_max with usage tracking.

-- 1. Add subscription_tier column
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text;

-- 2. Add usage tracking columns
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS photo_scans_used_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_minutes_used_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_date date,
  ADD COLUMN IF NOT EXISTS bonus_photo_scans integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_voice_minutes integer NOT NULL DEFAULT 0;

-- 3. Constraints
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_tier_check
    CHECK (
      subscription_tier IS NULL
      OR subscription_tier IN ('basic', 'pro', 'pro_max')
    );

-- 4. Update subscription_plan check to include tier-based plans
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_plan_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_plan_check
    CHECK (
      subscription_plan IS NULL
      OR subscription_plan IN ('trial', 'monthly')
    );

-- 5. Backfill: existing subscribers with no tier → pro (legacy behavior)
UPDATE public.user_profiles
  SET subscription_tier = 'pro'
  WHERE subscription_status IN ('trial', 'active')
    AND subscription_tier IS NULL;

-- 6. Comments
COMMENT ON COLUMN public.user_profiles.subscription_tier IS
  'Tier: basic, pro, or pro_max. Null if never subscribed.';
COMMENT ON COLUMN public.user_profiles.photo_scans_used_this_month IS
  'Photo/handwritten scans consumed in the current monthly cycle.';
COMMENT ON COLUMN public.user_profiles.voice_minutes_used_this_month IS
  'Voice dictation minutes consumed in the current monthly cycle.';
COMMENT ON COLUMN public.user_profiles.usage_reset_date IS
  'Date when monthly usage counters were last reset (1st of month).';
COMMENT ON COLUMN public.user_profiles.bonus_photo_scans IS
  'Extra photo scans purchased as one-time add-on credits.';
COMMENT ON COLUMN public.user_profiles.bonus_voice_minutes IS
  'Extra voice minutes purchased as one-time add-on credits.';
