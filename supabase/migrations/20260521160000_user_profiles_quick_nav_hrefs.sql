-- Optional ordered list of route hrefs for the header quick navigation strip; null = app defaults.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS quick_nav_hrefs jsonb;

COMMENT ON COLUMN public.user_profiles.quick_nav_hrefs IS
  'Ordered list of main-nav hrefs shown in the top quick bar; null means use default order and selection.';
