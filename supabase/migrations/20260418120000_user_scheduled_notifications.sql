-- User-scheduled smart push notifications (absolute UTC fire time + repeat).
create table if not exists public.user_scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  tag text not null default 'Other'
    check (tag in ('Revision', 'Study', 'Break', 'Admin', 'Other')),
  subject text null,
  chapter text null,
  next_fire_at timestamptz not null,
  user_timezone text not null default 'UTC',
  repeat_type text not null
    check (repeat_type in ('once', 'daily', 'weekly')),
  is_active boolean not null default true,
  last_fired_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_scheduled_notifications_title_len check (char_length(title) <= 200),
  constraint user_scheduled_notifications_body_len check (char_length(body) <= 500),
  constraint user_scheduled_notifications_subject_len check (subject is null or char_length(subject) <= 200),
  constraint user_scheduled_notifications_chapter_len check (chapter is null or char_length(chapter) <= 200),
  constraint user_scheduled_notifications_tz_len check (char_length(user_timezone) <= 120)
);

create index if not exists user_scheduled_notifications_user_active_fire_idx
  on public.user_scheduled_notifications (user_id, is_active, next_fire_at)
  where is_active = true;

create index if not exists user_scheduled_notifications_user_created_idx
  on public.user_scheduled_notifications (user_id, created_at desc);

alter table public.user_scheduled_notifications enable row level security;

drop policy if exists "user_scheduled_notifications_select_own" on public.user_scheduled_notifications;
create policy "user_scheduled_notifications_select_own"
  on public.user_scheduled_notifications for select
  using (auth.uid() = user_id);

drop policy if exists "user_scheduled_notifications_insert_own" on public.user_scheduled_notifications;
create policy "user_scheduled_notifications_insert_own"
  on public.user_scheduled_notifications for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_scheduled_notifications_update_own" on public.user_scheduled_notifications;
create policy "user_scheduled_notifications_update_own"
  on public.user_scheduled_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_scheduled_notifications_delete_own" on public.user_scheduled_notifications;
create policy "user_scheduled_notifications_delete_own"
  on public.user_scheduled_notifications for delete
  using (auth.uid() = user_id);
