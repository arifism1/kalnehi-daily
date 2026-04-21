-- Personal Motivation: letters, voice affirmations, vision photos, prefs (wallpaper).
-- Codifies the schema + RLS previously applied manually via supabase/sql/personal_motivation.sql.
-- All statements are idempotent.

create table if not exists public.motivation_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  letter_date date not null,
  body text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, letter_date)
);

create table if not exists public.motivation_voice_affirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transcript text not null default '',
  tags text[] not null default '{}',
  audio_mime text,
  audio_base64 text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists motivation_voice_user_recorded_idx
  on public.motivation_voice_affirmations (user_id, recorded_at desc);

create table if not exists public.motivation_vision_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_data_url text not null,
  caption text,
  photo_date date not null default (current_date),
  is_wallpaper boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists motivation_photos_user_created_idx
  on public.motivation_vision_photos (user_id, created_at desc);

create table if not exists public.user_motivation_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wallpaper_photo_id uuid references public.motivation_vision_photos (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.motivation_letters enable row level security;
alter table public.motivation_voice_affirmations enable row level security;
alter table public.motivation_vision_photos enable row level security;
alter table public.user_motivation_prefs enable row level security;

drop policy if exists "motivation_letters_select_own" on public.motivation_letters;
drop policy if exists "motivation_letters_insert_own" on public.motivation_letters;
drop policy if exists "motivation_letters_update_own" on public.motivation_letters;
drop policy if exists "motivation_letters_delete_own" on public.motivation_letters;

create policy "motivation_letters_select_own"
  on public.motivation_letters for select
  using (auth.uid() = user_id);

create policy "motivation_letters_insert_own"
  on public.motivation_letters for insert
  with check (auth.uid() = user_id);

create policy "motivation_letters_update_own"
  on public.motivation_letters for update
  using (auth.uid() = user_id);

create policy "motivation_letters_delete_own"
  on public.motivation_letters for delete
  using (auth.uid() = user_id);

drop policy if exists "motivation_voice_select_own" on public.motivation_voice_affirmations;
drop policy if exists "motivation_voice_insert_own" on public.motivation_voice_affirmations;
drop policy if exists "motivation_voice_update_own" on public.motivation_voice_affirmations;
drop policy if exists "motivation_voice_delete_own" on public.motivation_voice_affirmations;

create policy "motivation_voice_select_own"
  on public.motivation_voice_affirmations for select
  using (auth.uid() = user_id);

create policy "motivation_voice_insert_own"
  on public.motivation_voice_affirmations for insert
  with check (auth.uid() = user_id);

create policy "motivation_voice_update_own"
  on public.motivation_voice_affirmations for update
  using (auth.uid() = user_id);

create policy "motivation_voice_delete_own"
  on public.motivation_voice_affirmations for delete
  using (auth.uid() = user_id);

drop policy if exists "motivation_photos_select_own" on public.motivation_vision_photos;
drop policy if exists "motivation_photos_insert_own" on public.motivation_vision_photos;
drop policy if exists "motivation_photos_update_own" on public.motivation_vision_photos;
drop policy if exists "motivation_photos_delete_own" on public.motivation_vision_photos;

create policy "motivation_photos_select_own"
  on public.motivation_vision_photos for select
  using (auth.uid() = user_id);

create policy "motivation_photos_insert_own"
  on public.motivation_vision_photos for insert
  with check (auth.uid() = user_id);

create policy "motivation_photos_update_own"
  on public.motivation_vision_photos for update
  using (auth.uid() = user_id);

create policy "motivation_photos_delete_own"
  on public.motivation_vision_photos for delete
  using (auth.uid() = user_id);

drop policy if exists "motivation_prefs_select_own" on public.user_motivation_prefs;
drop policy if exists "motivation_prefs_insert_own" on public.user_motivation_prefs;
drop policy if exists "motivation_prefs_update_own" on public.user_motivation_prefs;
drop policy if exists "motivation_prefs_delete_own" on public.user_motivation_prefs;

create policy "motivation_prefs_select_own"
  on public.user_motivation_prefs for select
  using (auth.uid() = user_id);

create policy "motivation_prefs_insert_own"
  on public.user_motivation_prefs for insert
  with check (auth.uid() = user_id);

create policy "motivation_prefs_update_own"
  on public.user_motivation_prefs for update
  using (auth.uid() = user_id);

create policy "motivation_prefs_delete_own"
  on public.user_motivation_prefs for delete
  using (auth.uid() = user_id);
