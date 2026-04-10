-- Independent storage for pasted handwritten planner rows.
-- This table must never be mixed with main `tasks` or `voice_timeline_entries`.

create table if not exists public.handwritten_planner_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  source_text text not null default '',
  title text not null,
  start_time time,
  end_time time,
  duration text,
  parsed_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists handwritten_planner_user_date_idx
  on public.handwritten_planner_entries (user_id, log_date desc, created_at desc);

alter table public.handwritten_planner_entries enable row level security;

drop policy if exists "handwritten_planner_select_own" on public.handwritten_planner_entries;
drop policy if exists "handwritten_planner_insert_own" on public.handwritten_planner_entries;
drop policy if exists "handwritten_planner_update_own" on public.handwritten_planner_entries;
drop policy if exists "handwritten_planner_delete_own" on public.handwritten_planner_entries;

create policy "handwritten_planner_select_own"
  on public.handwritten_planner_entries for select
  using (auth.uid() = user_id);

create policy "handwritten_planner_insert_own"
  on public.handwritten_planner_entries for insert
  with check (auth.uid() = user_id);

create policy "handwritten_planner_update_own"
  on public.handwritten_planner_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "handwritten_planner_delete_own"
  on public.handwritten_planner_entries for delete
  using (auth.uid() = user_id);
