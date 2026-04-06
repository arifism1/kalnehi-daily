-- Independent study session log (claimed time vs camera-proven), synced offline-first.

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  is_camera_proven boolean not null default false,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_user_ended_idx
  on public.study_sessions (user_id, ended_at desc);

alter table public.study_sessions enable row level security;

create policy "study_sessions_select_own"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "study_sessions_insert_own"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);

create policy "study_sessions_update_own"
  on public.study_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "study_sessions_delete_own"
  on public.study_sessions for delete
  using (auth.uid() = user_id);
