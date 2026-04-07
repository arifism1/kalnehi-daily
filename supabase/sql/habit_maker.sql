-- Habit Maker: user-defined habits and per-day completion logs.
-- Run in Supabase SQL editor after auth is available.

create table if not exists public.user_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_habits_user_created_idx
  on public.user_habits (user_id, created_at asc);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.user_habits (id) on delete cascade,
  log_date date not null,
  completed boolean not null default false,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, habit_id, log_date)
);

create index if not exists habit_logs_user_habit_date_idx
  on public.habit_logs (user_id, habit_id, log_date desc);

alter table public.user_habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "user_habits_select_own"
  on public.user_habits for select using (auth.uid() = user_id);
create policy "user_habits_insert_own"
  on public.user_habits for insert with check (auth.uid() = user_id);
create policy "user_habits_update_own"
  on public.user_habits for update using (auth.uid() = user_id);
create policy "user_habits_delete_own"
  on public.user_habits for delete using (auth.uid() = user_id);

create policy "habit_logs_select_own"
  on public.habit_logs for select using (auth.uid() = user_id);
create policy "habit_logs_insert_own"
  on public.habit_logs for insert with check (auth.uid() = user_id);
create policy "habit_logs_update_own"
  on public.habit_logs for update using (auth.uid() = user_id);
create policy "habit_logs_delete_own"
  on public.habit_logs for delete using (auth.uid() = user_id);
