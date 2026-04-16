alter table public.user_profiles
add column if not exists upsc_optional_subjects text[] null;
