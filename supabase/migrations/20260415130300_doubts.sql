-- Optional cloud-side doubt rows (nullable subject). App stores doubts locally in IndexedDB;
-- this table supports future sync / reporting and matches product typing.

create table if not exists public.doubts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  description text not null default '',
  status text not null default 'current'
    check (status in ('current', 'working', 'solved')),
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists doubts_user_updated_idx
  on public.doubts (user_id, updated_at desc);

alter table public.doubts enable row level security;

drop policy if exists "doubts_select_own" on public.doubts;
drop policy if exists "doubts_insert_own" on public.doubts;
drop policy if exists "doubts_update_own" on public.doubts;
drop policy if exists "doubts_delete_own" on public.doubts;

create policy "doubts_select_own"
  on public.doubts for select
  using (auth.uid() = user_id);

create policy "doubts_insert_own"
  on public.doubts for insert
  with check (auth.uid() = user_id);

create policy "doubts_update_own"
  on public.doubts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "doubts_delete_own"
  on public.doubts for delete
  using (auth.uid() = user_id);

comment on table public.doubts is
  'User doubt tracker metadata; subject is optional. Client may remain IndexedDB-first.';
