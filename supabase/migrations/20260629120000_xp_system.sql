-- Gamification: XP, level, and audit trail for Kalnehi Unforgettable

alter table public.user_profiles
  add column if not exists xp integer not null default 0;

alter table public.user_profiles
  add column if not exists level integer not null default 1;

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  ref_id text not null default '',
  xp_awarded integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_type, ref_id)
);

create index if not exists xp_events_user_created_at_idx
  on public.xp_events (user_id, created_at desc);

alter table public.xp_events enable row level security;

create policy "Users read own xp events"
  on public.xp_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own xp events"
  on public.xp_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

comment on table public.xp_events is 'Per-event XP awards; ref_id enables deduplication (e.g. task id + day).';

-- Column-level UPDATE on user_profiles is restricted in 20260625120000_security_hardening.sql
grant update (xp, level) on public.user_profiles to authenticated;

comment on column public.user_profiles.xp is
  'Total XP; updated by app after xp_events insert (RLS + column grants).';
comment on column public.user_profiles.level is
  'Derived level from XP; updated alongside xp.';
