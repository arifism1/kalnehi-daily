-- Allow fractional voice minute usage (duration-based billing).
ALTER TABLE public.user_profiles
  ALTER COLUMN voice_minutes_used_this_month TYPE NUMERIC(10, 4)
  USING COALESCE(voice_minutes_used_this_month, 0)::NUMERIC(10, 4);
