-- Relative Effort Rating for target score recommendation engine.
-- Adds effort score to syllabus rows and a history table for past recommendations.

alter table public.syllabus_master
add column if not exists relative_effort_score double precision;

alter table public.syllabus_master
drop constraint if exists syllabus_master_relative_effort_score_positive;

alter table public.syllabus_master
add constraint syllabus_master_relative_effort_score_positive
check (
  relative_effort_score is null
  or relative_effort_score > 0
);

comment on column public.syllabus_master.relative_effort_score is
  'Relative effort required for the syllabus row. Used in chapter-level efficiency = average_marks / relative_effort_score.';

create index if not exists syllabus_master_exam_effort_idx
  on public.syllabus_master (exam_name, relative_effort_score)
  where relative_effort_score is not null;

create table if not exists public.user_target_recommendation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  exam_name text not null,
  target_boost double precision not null check (target_boost > 0),
  achieved_marks double precision not null check (achieved_marks >= 0),
  recommended_items jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb
);

comment on table public.user_target_recommendation_history is
  'Snapshot log of target boost recommendations. recommended_items stores selected chapters and scoring details.';

comment on column public.user_target_recommendation_history.target_boost is
  'Requested additional marks target passed to recommendation engine.';

comment on column public.user_target_recommendation_history.achieved_marks is
  'Cumulative estimated marks covered by selected chapters in the recommendation.';

comment on column public.user_target_recommendation_history.recommended_items is
  'JSON array of selected chapters with efficiency, average_marks, and relative_effort_score.';

comment on column public.user_target_recommendation_history.meta is
  'Additional metadata for versioning, tie-break strategy, or debugging context.';

create index if not exists user_target_recommendation_history_user_created_idx
  on public.user_target_recommendation_history (user_id, created_at desc);

create index if not exists user_target_recommendation_history_exam_created_idx
  on public.user_target_recommendation_history (exam_name, created_at desc);

alter table public.user_target_recommendation_history enable row level security;

drop policy if exists "user_target_recommendation_history_select_own"
  on public.user_target_recommendation_history;
create policy "user_target_recommendation_history_select_own"
  on public.user_target_recommendation_history for select
  using (auth.uid() = user_id);

drop policy if exists "user_target_recommendation_history_insert_own"
  on public.user_target_recommendation_history;
create policy "user_target_recommendation_history_insert_own"
  on public.user_target_recommendation_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_target_recommendation_history_update_own"
  on public.user_target_recommendation_history;
create policy "user_target_recommendation_history_update_own"
  on public.user_target_recommendation_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_target_recommendation_history_delete_own"
  on public.user_target_recommendation_history;
create policy "user_target_recommendation_history_delete_own"
  on public.user_target_recommendation_history for delete
  using (auth.uid() = user_id);
