ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS has_had_trial BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: anyone who has ever been active, expired, or cancelled already had a trial
UPDATE user_profiles
SET has_had_trial = TRUE
WHERE subscription_status IN ('active', 'expired', 'cancelled');
