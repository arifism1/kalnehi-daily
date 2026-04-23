-- Client-mirrored UI preferences (cross-device) and one-time signup attribution.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ui_prefs jsonb NULL,
  ADD COLUMN IF NOT EXISTS signup_attribution jsonb NULL;

COMMENT ON COLUMN public.user_profiles.ui_prefs IS
  'Optional JSON blob mirroring client UI settings (theme, toggles) for cross-device sync.';

COMMENT ON COLUMN public.user_profiles.signup_attribution IS
  'First-touch landing URL / referrer / UTM captured once at first authenticated session for analytics.';
