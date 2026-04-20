-- Smart Revision Engine: per-session logs + per-topic scheduling state.

create table if not exists public.user_revision_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  syllabus_master_id uuid references public.syllabus_master (id) on delete set null,
  topic_title text not null,
  session_kind text not null
    check (
      session_kind in (
        'daily_suggestion_shown',
        'suggestion_accepted',
        'suggestion_dismissed',
        'active_recall_typed',
        'active_recall_voice',
        'confidence_only',
        'next_review_scheduled'
      )
    ),
  recall_transcript text,
  groq_model text,
  groq_feedback jsonb,
  confidence_stars smallint
    check (confidence_stars is null or (confidence_stars >= 1 and confidence_stars <= 5)),
  suggested_next_review_date date,
  next_review_effective_date date,
  user_overrode_next_review boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_revision_logs_user_created_idx
  on public.user_revision_logs (user_id, created_at desc);

create index if not exists user_revision_logs_user_syllabus_created_idx
  on public.user_revision_logs (user_id, syllabus_master_id, created_at desc);

comment on table public.user_revision_logs is
  'Append-only revision events (recall, suggestions, scheduling) for Smart Revision Engine.';

alter table public.user_revision_logs enable row level security;

drop policy if exists "user_revision_logs_select_own" on public.user_revision_logs;
drop policy if exists "user_revision_logs_insert_own" on public.user_revision_logs;
drop policy if exists "user_revision_logs_update_own" on public.user_revision_logs;
drop policy if exists "user_revision_logs_delete_own" on public.user_revision_logs;

create policy "user_revision_logs_select_own"
  on public.user_revision_logs for select
  using (auth.uid() = user_id);

create policy "user_revision_logs_insert_own"
  on public.user_revision_logs for insert
  with check (auth.uid() = user_id);

create policy "user_revision_logs_update_own"
  on public.user_revision_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_revision_logs_delete_own"
  on public.user_revision_logs for delete
  using (auth.uid() = user_id);

-- One row per user + microtopic: fast reads for danger zone and suggestions.
create table if not exists public.user_revision_topic_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  syllabus_master_id uuid not null references public.syllabus_master (id) on delete cascade,
  topic_title text not null,
  next_review_effective_date date,
  last_confidence_stars smallint
    check (last_confidence_stars is null or (last_confidence_stars >= 1 and last_confidence_stars <= 5)),
  last_recalled_at timestamptz,
  last_suggested_interval_min int,
  last_suggested_interval_max int,
  updated_at timestamptz not null default now(),
  primary key (user_id, syllabus_master_id)
);

create index if not exists user_revision_topic_state_user_next_idx
  on public.user_revision_topic_state (user_id, next_review_effective_date);

comment on table public.user_revision_topic_state is
  'Current spaced-repetition anchor per microtopic; updated with each completed recall.';

alter table public.user_revision_topic_state enable row level security;

drop policy if exists "user_revision_topic_state_select_own" on public.user_revision_topic_state;
drop policy if exists "user_revision_topic_state_insert_own" on public.user_revision_topic_state;
drop policy if exists "user_revision_topic_state_update_own" on public.user_revision_topic_state;
drop policy if exists "user_revision_topic_state_delete_own" on public.user_revision_topic_state;

create policy "user_revision_topic_state_select_own"
  on public.user_revision_topic_state for select
  using (auth.uid() = user_id);

create policy "user_revision_topic_state_insert_own"
  on public.user_revision_topic_state for insert
  with check (auth.uid() = user_id);

create policy "user_revision_topic_state_update_own"
  on public.user_revision_topic_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_revision_topic_state_delete_own"
  on public.user_revision_topic_state for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_revision_logs to authenticated;
grant select, insert, update, delete on public.user_revision_topic_state to authenticated;
