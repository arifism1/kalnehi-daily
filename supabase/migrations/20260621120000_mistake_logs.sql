-- Mistake / Error Log.
-- 4-type mistake taxonomy linked to the syllabus tree.
-- Works exam-agnostically: the user picks subject + optional syllabus row.

create table if not exists public.mistake_logs (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users (id) on delete cascade,
  logged_at          timestamptz not null default now(),
  subject            text        not null,
  syllabus_master_id uuid        references public.syllabus_master (id) on delete set null,
  topic_label        text,
  mistake_type       text        not null
    check (mistake_type in ('knowledge_gap', 'application_error', 'careless', 'time_pressure')),
  source             text
    check (source in ('mock_test', 'practice', 'class', 'other')),
  mock_test_id       uuid        references public.mock_tests (id) on delete set null,
  note               text,
  flag_for_revision  boolean     not null default false,
  created_at         timestamptz not null default now()
);

create index if not exists mistake_logs_user_logged_idx
  on public.mistake_logs (user_id, logged_at desc);

create index if not exists mistake_logs_user_subject_idx
  on public.mistake_logs (user_id, subject);

alter table public.mistake_logs enable row level security;

drop policy if exists "mistake_logs_select_own" on public.mistake_logs;
drop policy if exists "mistake_logs_insert_own" on public.mistake_logs;
drop policy if exists "mistake_logs_update_own" on public.mistake_logs;
drop policy if exists "mistake_logs_delete_own" on public.mistake_logs;

create policy "mistake_logs_select_own"
  on public.mistake_logs for select
  using (auth.uid() = user_id);

create policy "mistake_logs_insert_own"
  on public.mistake_logs for insert
  with check (auth.uid() = user_id);

create policy "mistake_logs_update_own"
  on public.mistake_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "mistake_logs_delete_own"
  on public.mistake_logs for delete
  using (auth.uid() = user_id);

comment on table public.mistake_logs is
  'Exam-agnostic mistake log with 4 taxonomy types: knowledge_gap, application_error, careless, time_pressure. Optional link to syllabus_master and mock_tests.';
