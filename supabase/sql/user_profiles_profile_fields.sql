-- Run in Supabase SQL editor if these columns are missing on public.user_profiles.
alter table public.user_profiles
  add column if not exists target_exam text;

alter table public.user_profiles
  add column if not exists prev_exam_attempted boolean;

alter table public.user_profiles
  add column if not exists prev_score integer;

comment on column public.user_profiles.target_exam is 'Target exam label (e.g. NEET UG)';
comment on column public.user_profiles.prev_exam_attempted is 'Whether the user attempted the exam before';
comment on column public.user_profiles.prev_score is 'Previous attempt score when prev_exam_attempted is true';
