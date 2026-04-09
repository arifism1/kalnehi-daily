-- Dedicated meditation log table.
-- Kept fully independent from study_sessions and task_sessions.

create table if not exists public.meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  duration_minutes integer not null check (duration_minutes > 0),
  session_type text not null,
  notes text null,
  guided boolean not null default true,
  soundscape text null,
  created_at timestamptz not null default now()
);

create index if not exists meditation_sessions_user_date_idx
  on public.meditation_sessions (user_id, date desc);

create index if not exists meditation_sessions_user_created_idx
  on public.meditation_sessions (user_id, created_at desc);

alter table public.meditation_sessions enable row level security;

drop policy if exists "meditation_sessions_select_own" on public.meditation_sessions;
create policy "meditation_sessions_select_own"
  on public.meditation_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "meditation_sessions_insert_own" on public.meditation_sessions;
create policy "meditation_sessions_insert_own"
  on public.meditation_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "meditation_sessions_update_own" on public.meditation_sessions;
create policy "meditation_sessions_update_own"
  on public.meditation_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "meditation_sessions_delete_own" on public.meditation_sessions;
create policy "meditation_sessions_delete_own"
  on public.meditation_sessions for delete
  using (auth.uid() = user_id);
