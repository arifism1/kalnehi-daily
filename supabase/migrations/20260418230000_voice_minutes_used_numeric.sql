-- Fractional voice minute accounting (duration-based billing).
ALTER TABLE public.user_profiles
  ALTER COLUMN voice_minutes_used_this_month TYPE numeric(10, 4)
  USING voice_minutes_used_this_month::numeric;

COMMENT ON COLUMN public.user_profiles.voice_minutes_used_this_month IS
  'Voice minutes consumed this calendar month (IST boundary); supports fractional minutes from duration-based billing.';
