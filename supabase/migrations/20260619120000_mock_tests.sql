-- Mock Test Tracker tables.
-- Stores user-logged mock test sessions with per-subject scores.
-- Works for any exam: raw scores, percentages, or percentiles.

create table if not exists public.mock_tests (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  test_date       date        not null default current_date,
  test_name       text        not null default '',
  exam_name       text        not null default '',
  score_type      text        not null default 'raw'
    check (score_type in ('raw', 'percentage', 'percentile')),
  max_score       numeric,
  total_score     numeric,
  duration_minutes integer,
  self_rating     text
    check (self_rating in ('strong', 'average', 'weak')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists mock_tests_user_date_idx
  on public.mock_tests (user_id, test_date desc);

alter table public.mock_tests enable row level security;

drop policy if exists "mock_tests_select_own" on public.mock_tests;
drop policy if exists "mock_tests_insert_own" on public.mock_tests;
drop policy if exists "mock_tests_update_own" on public.mock_tests;
drop policy if exists "mock_tests_delete_own" on public.mock_tests;

create policy "mock_tests_select_own"
  on public.mock_tests for select
  using (auth.uid() = user_id);

create policy "mock_tests_insert_own"
  on public.mock_tests for insert
  with check (auth.uid() = user_id);

create policy "mock_tests_update_own"
  on public.mock_tests for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "mock_tests_delete_own"
  on public.mock_tests for delete
  using (auth.uid() = user_id);

comment on table public.mock_tests is
  'User-logged mock test sessions. score_type determines whether total_score is a raw mark, percentage, or percentile.';


-- Per-subject breakdown for each mock test.

create table if not exists public.mock_test_subject_scores (
  id            uuid    primary key default gen_random_uuid(),
  mock_test_id  uuid    not null references public.mock_tests (id) on delete cascade,
  subject       text    not null,
  max_score     numeric,
  score         numeric,
  created_at    timestamptz not null default now()
);

create index if not exists mock_test_subject_scores_test_idx
  on public.mock_test_subject_scores (mock_test_id);

alter table public.mock_test_subject_scores enable row level security;

drop policy if exists "mock_test_subject_scores_select_own" on public.mock_test_subject_scores;
drop policy if exists "mock_test_subject_scores_insert_own" on public.mock_test_subject_scores;
drop policy if exists "mock_test_subject_scores_update_own" on public.mock_test_subject_scores;
drop policy if exists "mock_test_subject_scores_delete_own" on public.mock_test_subject_scores;

create policy "mock_test_subject_scores_select_own"
  on public.mock_test_subject_scores for select
  using (
    exists (
      select 1 from public.mock_tests mt
      where mt.id = mock_test_id
        and mt.user_id = auth.uid()
    )
  );

create policy "mock_test_subject_scores_insert_own"
  on public.mock_test_subject_scores for insert
  with check (
    exists (
      select 1 from public.mock_tests mt
      where mt.id = mock_test_id
        and mt.user_id = auth.uid()
    )
  );

create policy "mock_test_subject_scores_update_own"
  on public.mock_test_subject_scores for update
  using (
    exists (
      select 1 from public.mock_tests mt
      where mt.id = mock_test_id
        and mt.user_id = auth.uid()
    )
  );

create policy "mock_test_subject_scores_delete_own"
  on public.mock_test_subject_scores for delete
  using (
    exists (
      select 1 from public.mock_tests mt
      where mt.id = mock_test_id
        and mt.user_id = auth.uid()
    )
  );

comment on table public.mock_test_subject_scores is
  'Per-subject score rows for a mock_tests entry. Subjects match the user exam syllabus subjects.';
