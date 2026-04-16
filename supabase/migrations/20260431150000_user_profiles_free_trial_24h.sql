-- One-time 24h welcome free trial (photo AI scans + voice minutes), separate from Razorpay 3-day paid trial.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_photo_scans_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_voice_minutes_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_used_free_trial boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_profiles.trial_started_at IS
  'UTC start of the 24-hour welcome free trial window; set once when the user becomes eligible and starts.';
COMMENT ON COLUMN public.user_profiles.trial_photo_scans_used IS
  'Photo AI scans consumed during the 24h welcome trial (not monthly counters).';
COMMENT ON COLUMN public.user_profiles.trial_voice_minutes_used IS
  'Voice minutes consumed during the 24h welcome trial (integer minutes).';
COMMENT ON COLUMN public.user_profiles.has_used_free_trial IS
  'True after the one-time welcome trial has been claimed (trial_started_at set) or for legacy users ineligible for a new trial.';

-- Existing accounts: do not grant a new 24h trial on deploy (only new signups after migration default has_used_free_trial = false).
UPDATE public.user_profiles
SET has_used_free_trial = true
WHERE has_used_free_trial = false;
