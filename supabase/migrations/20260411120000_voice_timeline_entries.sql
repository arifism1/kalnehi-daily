-- Voice "Dictate My Day" timeline entries (Hinglish transcript → structured log).

create table if not exists public.voice_timeline_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  transcript_raw text not null,
  title text not null,
  description text not null default '',
  category text not null
    check (
      category in (
        'study',
        'break',
        'personal',
        'exam_prep',
        'commute',
        'meal',
        'hygiene',
        'other'
      )
    ),
  subject text,
  chapter text,
  estimated_minutes integer
    check (
      estimated_minutes is null
      or (estimated_minutes >= 0 and estimated_minutes <= 1440)
    ),
  occurred_at timestamptz not null default now(),
  parsed_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_timeline_user_date_idx
  on public.voice_timeline_entries (user_id, log_date desc, occurred_at desc);

alter table public.voice_timeline_entries enable row level security;

drop policy if exists "voice_timeline_select_own" on public.voice_timeline_entries;
drop policy if exists "voice_timeline_insert_own" on public.voice_timeline_entries;
drop policy if exists "voice_timeline_update_own" on public.voice_timeline_entries;
drop policy if exists "voice_timeline_delete_own" on public.voice_timeline_entries;

create policy "voice_timeline_select_own"
  on public.voice_timeline_entries for select
  using (auth.uid() = user_id);

create policy "voice_timeline_insert_own"
  on public.voice_timeline_entries for insert
  with check (auth.uid() = user_id);

create policy "voice_timeline_update_own"
  on public.voice_timeline_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "voice_timeline_delete_own"
  on public.voice_timeline_entries for delete
  using (auth.uid() = user_id);
