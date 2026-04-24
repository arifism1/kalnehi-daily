-- app_updates: admin-broadcast feature announcements visible to all authenticated users.
-- user_app_update_reads: per-user read receipts so the Updates tab can show an unread count.

create table if not exists public.app_updates (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  message     text not null,
  category    text not null default 'Announcement'
              check (category in ('New Feature', 'Improvement', 'Bug Fix', 'Announcement')),
  created_at  timestamptz not null default now()
);

create index if not exists app_updates_created_idx
  on public.app_updates (created_at desc);

-- Only authenticated users may SELECT; INSERT/UPDATE/DELETE is service-role only (bypasses RLS).
alter table public.app_updates enable row level security;

drop policy if exists "app_updates_select_authenticated" on public.app_updates;
create policy "app_updates_select_authenticated"
  on public.app_updates for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------

create table if not exists public.user_app_update_reads (
  user_id    uuid not null references auth.users (id) on delete cascade,
  update_id  uuid not null references public.app_updates (id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (user_id, update_id)
);

create index if not exists user_app_update_reads_user_idx
  on public.user_app_update_reads (user_id);

alter table public.user_app_update_reads enable row level security;

drop policy if exists "user_app_update_reads_select_own" on public.user_app_update_reads;
create policy "user_app_update_reads_select_own"
  on public.user_app_update_reads for select
  using (auth.uid() = user_id);

drop policy if exists "user_app_update_reads_insert_own" on public.user_app_update_reads;
create policy "user_app_update_reads_insert_own"
  on public.user_app_update_reads for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_app_update_reads_delete_own" on public.user_app_update_reads;
create policy "user_app_update_reads_delete_own"
  on public.user_app_update_reads for delete
  using (auth.uid() = user_id);
