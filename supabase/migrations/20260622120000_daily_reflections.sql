-- End-of-Day Reflection.
-- 3-question daily debrief: finished today, skipped today, tomorrow priority.
-- One row per user per calendar date (upsert-safe via unique constraint).

create table if not exists public.daily_reflections (
  id                  uuid    primary key default gen_random_uuid(),
  user_id             uuid    not null references auth.users (id) on delete cascade,
  reflection_date     date    not null default current_date,
  finished_today      text,
  skipped_today       text,
  tomorrow_priority   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, reflection_date)
);

create index if not exists daily_reflections_user_date_idx
  on public.daily_reflections (user_id, reflection_date desc);

alter table public.daily_reflections enable row level security;

drop policy if exists "daily_reflections_select_own" on public.daily_reflections;
drop policy if exists "daily_reflections_insert_own" on public.daily_reflections;
drop policy if exists "daily_reflections_update_own" on public.daily_reflections;
drop policy if exists "daily_reflections_delete_own" on public.daily_reflections;

create policy "daily_reflections_select_own"
  on public.daily_reflections for select
  using (auth.uid() = user_id);

create policy "daily_reflections_insert_own"
  on public.daily_reflections for insert
  with check (auth.uid() = user_id);

create policy "daily_reflections_update_own"
  on public.daily_reflections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_reflections_delete_own"
  on public.daily_reflections for delete
  using (auth.uid() = user_id);

comment on table public.daily_reflections is
  '60-second end-of-day debrief: what you finished, what you skipped, and tomorrow''s top priority. One row per user per date.';
