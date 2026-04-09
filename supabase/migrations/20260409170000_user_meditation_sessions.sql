-- Meditation sessions: offline-first logs synced per user.

create table if not exists public.user_meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_date date not null,
  meditation_type text not null,
  duration_seconds integer not null check (duration_seconds > 0),
  note text null,
  soundscape text null,
  guided boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_meditation_sessions_user_date_idx
  on public.user_meditation_sessions (user_id, session_date desc);

create index if not exists user_meditation_sessions_user_created_idx
  on public.user_meditation_sessions (user_id, created_at desc);

alter table public.user_meditation_sessions enable row level security;

drop policy if exists "user_meditation_sessions_select_own" on public.user_meditation_sessions;
create policy "user_meditation_sessions_select_own"
  on public.user_meditation_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "user_meditation_sessions_insert_own" on public.user_meditation_sessions;
create policy "user_meditation_sessions_insert_own"
  on public.user_meditation_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_meditation_sessions_update_own" on public.user_meditation_sessions;
create policy "user_meditation_sessions_update_own"
  on public.user_meditation_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_meditation_sessions_delete_own" on public.user_meditation_sessions;
create policy "user_meditation_sessions_delete_own"
  on public.user_meditation_sessions for delete
  using (auth.uid() = user_id);
