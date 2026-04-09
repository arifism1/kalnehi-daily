-- Mandatory post-signup profile fields + completion timestamp.

alter table public.user_profiles
  add column if not exists phone_number text,
  add column if not exists class_studying text,
  add column if not exists mandatory_onboarding_completed_at timestamptz;

comment on column public.user_profiles.phone_number is '10-digit Indian mobile (validated in app)';
comment on column public.user_profiles.class_studying is 'Current class / dropper label from complete-profile';
comment on column public.user_profiles.mandatory_onboarding_completed_at is 'Set when user finishes /complete-profile';

-- Backfill: treat existing rows as already onboarded so we do not block legacy users.
update public.user_profiles
set mandatory_onboarding_completed_at = coalesce(
  mandatory_onboarding_completed_at,
  now()
)
where mandatory_onboarding_completed_at is null;
