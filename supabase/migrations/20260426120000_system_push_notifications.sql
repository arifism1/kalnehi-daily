-- Scheduled / event-driven FCM system messages (Morning, Evening, Danger zone).
alter table public.user_profiles
  add column if not exists system_push_notifications boolean not null default true;

comment on column public.user_profiles.system_push_notifications is
  'When true, user may receive automated Kalnehi system pushes (IST schedule + danger zone).';

-- At most one automated push per user per kind per calendar day (Asia/Kolkata date_key).
create table if not exists public.user_system_push_dedupe (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null
    check (kind in ('morning_kickstart', 'evening_winddown', 'danger_zone')),
  date_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, date_key)
);

create index if not exists user_system_push_dedupe_user_created_idx
  on public.user_system_push_dedupe (user_id, created_at desc);

alter table public.user_system_push_dedupe enable row level security;

-- No policies: only service role (server) touches this table.
