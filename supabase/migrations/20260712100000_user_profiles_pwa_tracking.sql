-- PWA install tracking columns on user_profiles.
-- pwa_install_status: whether the user has installed the PWA or is using the browser.
-- pwa_install_platform: 'ios' | 'android' (null = browser / unknown).
-- pwa_first_opened_at: first time the app was opened in standalone mode.
-- pwa_last_opened_at: most recent standalone open (updated on every session start).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS pwa_install_status   text,
  ADD COLUMN IF NOT EXISTS pwa_install_platform  text,
  ADD COLUMN IF NOT EXISTS pwa_first_opened_at   timestamptz,
  ADD COLUMN IF NOT EXISTS pwa_last_opened_at    timestamptz;

COMMENT ON COLUMN public.user_profiles.pwa_install_status   IS 'browser | installed_ios | installed_android';
COMMENT ON COLUMN public.user_profiles.pwa_install_platform IS 'ios | android | null';
COMMENT ON COLUMN public.user_profiles.pwa_first_opened_at  IS 'Timestamp of first standalone PWA launch.';
COMMENT ON COLUMN public.user_profiles.pwa_last_opened_at   IS 'Timestamp of most recent standalone PWA launch.';

-- Allow the authenticated user to update their own PWA status columns.
-- Existing RLS on user_profiles already allows users to update their own row;
-- these new columns inherit that policy automatically.
