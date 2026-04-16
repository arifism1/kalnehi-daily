-- Welcome trial: track voice usage in seconds (cap 180 = 3 minutes) for accurate partial-minute billing.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS trial_voice_seconds_used integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'trial_voice_minutes_used'
  ) THEN
    UPDATE public.user_profiles
    SET trial_voice_seconds_used = GREATEST(
      trial_voice_seconds_used,
      COALESCE(trial_voice_minutes_used, 0) * 60
    );
    ALTER TABLE public.user_profiles DROP COLUMN trial_voice_minutes_used;
  END IF;
END $$;

COMMENT ON COLUMN public.user_profiles.trial_voice_seconds_used IS
  'Voice seconds consumed during the 24h welcome trial (cap 180).';
