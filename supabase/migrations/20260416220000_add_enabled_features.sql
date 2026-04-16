-- Add enabled_features column to user_profiles.
-- NULL means "all features enabled" (no customisation applied yet).
-- A non-null array contains the feature IDs the user has explicitly chosen to show.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS enabled_features text[] DEFAULT NULL;
