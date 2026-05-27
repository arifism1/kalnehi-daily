-- Durable retry queue for failed custom/scheduled push sends (service-role cron only).

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('custom_reminder', 'scheduled_notification')),
  payload jsonb not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  retry_count int not null default 0 check (retry_count >= 0 and retry_count <= 10),
  last_attempted_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists notification_jobs_pending_scheduled_idx
  on public.notification_jobs (scheduled_for)
  where status in ('pending', 'failed');

alter table public.notification_jobs enable row level security;

-- No client access; cron uses service role.
create policy notification_jobs_deny_all
  on public.notification_jobs
  for all
  to authenticated, anon
  using (false)
  with check (false);

comment on table public.notification_jobs is
  'Retry queue for FCM notification cron failures; processed by /api/cron/notification-worker.';
