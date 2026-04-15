-- Saved Target Score Blueprint snapshots (one row per save; created_at = when added).

create table public.user_target_blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  exam_name text not null,
  max_score integer not null,
  target_clamped integer not null,
  range_low integer not null,
  range_high integer not null,
  mode text not null check (mode in ('absolute', 'gain')),
  estimated_marks_at_save integer not null,
  total_marks_covered integer not null,
  chapters jsonb not null default '[]'::jsonb
);

create index user_target_blueprints_user_created_idx
  on public.user_target_blueprints (user_id, created_at desc);

comment on table public.user_target_blueprints is
  'User-saved chapter lists from Target Score Blueprint; chapters is JSON array of {subject, chapter, chapterMarksTotal, microtopicProgressPercent}.';

alter table public.user_target_blueprints enable row level security;

create policy "user_target_blueprints_select_own"
  on public.user_target_blueprints for select
  using (auth.uid() = user_id);

create policy "user_target_blueprints_insert_own"
  on public.user_target_blueprints for insert
  with check (auth.uid() = user_id);

create policy "user_target_blueprints_update_own"
  on public.user_target_blueprints for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_target_blueprints_delete_own"
  on public.user_target_blueprints for delete
  using (auth.uid() = user_id);
