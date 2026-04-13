-- User-defined push reminder schedules (IST wall clock + repeat).
create table if not exists public.user_custom_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  scheduled_time time not null,
  repeat_type text not null
    check (repeat_type in ('daily', 'once')),
  is_active boolean not null default true,
  run_once_on_ist_date date null,
  last_fired_ist_date text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_custom_notifications_title_len check (char_length(title) <= 120),
  constraint user_custom_notifications_body_len check (char_length(body) <= 500),
  constraint user_custom_notifications_once_date_chk check (
    (repeat_type = 'once' and run_once_on_ist_date is not null)
    or (repeat_type = 'daily' and run_once_on_ist_date is null)
  )
);

create index if not exists user_custom_notifications_user_active_idx
  on public.user_custom_notifications (user_id, is_active)
  where is_active = true;

create index if not exists user_custom_notifications_user_created_idx
  on public.user_custom_notifications (user_id, created_at desc);

alter table public.user_custom_notifications enable row level security;

drop policy if exists "user_custom_notifications_select_own" on public.user_custom_notifications;
create policy "user_custom_notifications_select_own"
  on public.user_custom_notifications for select
  using (auth.uid() = user_id);

drop policy if exists "user_custom_notifications_insert_own" on public.user_custom_notifications;
create policy "user_custom_notifications_insert_own"
  on public.user_custom_notifications for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_custom_notifications_update_own" on public.user_custom_notifications;
create policy "user_custom_notifications_update_own"
  on public.user_custom_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_custom_notifications_delete_own" on public.user_custom_notifications;
create policy "user_custom_notifications_delete_own"
  on public.user_custom_notifications for delete
  using (auth.uid() = user_id);
