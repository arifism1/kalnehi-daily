-- Unified daily plan: one row per user per calendar date, tasks from typed / voice / handwritten.

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create index if not exists daily_plans_user_date_idx
  on public.daily_plans (user_id, plan_date desc);

create table if not exists public.daily_tasks (
  id uuid primary key,
  daily_plan_id uuid not null references public.daily_plans (id) on delete cascade,
  title text not null,
  time_slot text,
  time_start time,
  time_end time,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  status text not null default 'pending'
    check (status in ('pending', 'done', 'skipped')),
  source text not null
    check (source in ('typed', 'voice', 'handwritten')),
  source_raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_tasks_plan_created_idx
  on public.daily_tasks (daily_plan_id, created_at asc);

alter table public.daily_plans enable row level security;
alter table public.daily_tasks enable row level security;

drop policy if exists "daily_plans_select_own" on public.daily_plans;
drop policy if exists "daily_plans_insert_own" on public.daily_plans;
drop policy if exists "daily_plans_update_own" on public.daily_plans;
drop policy if exists "daily_plans_delete_own" on public.daily_plans;
drop policy if exists "daily_tasks_select_own" on public.daily_tasks;
drop policy if exists "daily_tasks_insert_own" on public.daily_tasks;
drop policy if exists "daily_tasks_update_own" on public.daily_tasks;
drop policy if exists "daily_tasks_delete_own" on public.daily_tasks;

create policy "daily_plans_select_own"
  on public.daily_plans for select
  using (auth.uid() = user_id);

create policy "daily_plans_insert_own"
  on public.daily_plans for insert
  with check (auth.uid() = user_id);

create policy "daily_plans_update_own"
  on public.daily_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_plans_delete_own"
  on public.daily_plans for delete
  using (auth.uid() = user_id);

create policy "daily_tasks_select_own"
  on public.daily_tasks for select
  using (
    exists (
      select 1 from public.daily_plans p
      where p.id = daily_plan_id and p.user_id = auth.uid()
    )
  );

create policy "daily_tasks_insert_own"
  on public.daily_tasks for insert
  with check (
    exists (
      select 1 from public.daily_plans p
      where p.id = daily_plan_id and p.user_id = auth.uid()
    )
  );

create policy "daily_tasks_update_own"
  on public.daily_tasks for update
  using (
    exists (
      select 1 from public.daily_plans p
      where p.id = daily_plan_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.daily_plans p
      where p.id = daily_plan_id and p.user_id = auth.uid()
    )
  );

create policy "daily_tasks_delete_own"
  on public.daily_tasks for delete
  using (
    exists (
      select 1 from public.daily_plans p
      where p.id = daily_plan_id and p.user_id = auth.uid()
    )
  );

-- One-time backfill from legacy voice + handwritten planners (idempotent).
insert into public.daily_plans (user_id, plan_date)
select distinct user_id, log_date from public.voice_timeline_entries
on conflict (user_id, plan_date) do nothing;

insert into public.daily_plans (user_id, plan_date)
select distinct user_id, log_date from public.handwritten_planner_entries
on conflict (user_id, plan_date) do nothing;

insert into public.daily_tasks (
  id,
  daily_plan_id,
  title,
  time_slot,
  time_start,
  time_end,
  priority,
  status,
  source,
  source_raw_text,
  created_at
)
select
  v.id,
  p.id,
  left(trim(v.title), 500),
  case
    when (v.parsed_json->>'start_time') is not null
      and (v.parsed_json->>'end_time') is not null
    then (v.parsed_json->>'start_time') || '–' || (v.parsed_json->>'end_time')
    when (v.parsed_json->>'start_time') is not null
    then (v.parsed_json->>'start_time')
    else null
  end,
  case
    when (v.parsed_json->>'start_time') ~ '^\d{2}:\d{2}$'
    then (v.parsed_json->>'start_time')::time
    else null
  end,
  case
    when (v.parsed_json->>'end_time') ~ '^\d{2}:\d{2}$'
    then (v.parsed_json->>'end_time')::time
    else null
  end,
  'normal',
  case when coalesce(v.parsed_json->>'planner_include', 'true') = 'false' then 'skipped' else 'pending' end,
  'voice',
  left(v.transcript_raw, 12000),
  v.created_at
from public.voice_timeline_entries v
join public.daily_plans p
  on p.user_id = v.user_id and p.plan_date = v.log_date
on conflict (id) do nothing;

insert into public.daily_tasks (
  id,
  daily_plan_id,
  title,
  time_slot,
  time_start,
  time_end,
  priority,
  status,
  source,
  source_raw_text,
  created_at
)
select
  h.id,
  p.id,
  left(trim(h.title), 500),
  case
    when h.start_time is not null and h.end_time is not null
    then to_char(h.start_time, 'HH24:MI') || '–' || to_char(h.end_time, 'HH24:MI')
    when h.start_time is not null
    then to_char(h.start_time, 'HH24:MI')
    else null
  end,
  h.start_time,
  h.end_time,
  'normal',
  case when coalesce(h.parsed_json->>'planner_include', 'true') = 'false' then 'skipped' else 'pending' end,
  'handwritten',
  left(h.source_text, 12000),
  h.created_at
from public.handwritten_planner_entries h
join public.daily_plans p
  on p.user_id = h.user_id and p.plan_date = h.log_date
on conflict (id) do nothing;
