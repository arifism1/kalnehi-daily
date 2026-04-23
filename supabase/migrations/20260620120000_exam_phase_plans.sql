-- Exam Phase Plans — Macro Year Planner.
-- Stores which subjects a user has assigned to each prep phase
-- (foundation / consolidation / final_sprint) with optional weekly targets.
-- Phase date boundaries are computed in-app from user_profiles.target_exam_date.

create table if not exists public.exam_phase_plans (
  id                   uuid    primary key default gen_random_uuid(),
  user_id              uuid    not null references auth.users (id) on delete cascade,
  phase                text    not null
    check (phase in ('foundation', 'consolidation', 'final_sprint')),
  subject              text    not null,
  weekly_hours_target  numeric,
  revision_cycles      integer not null default 1,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, phase, subject)
);

create index if not exists exam_phase_plans_user_idx
  on public.exam_phase_plans (user_id);

alter table public.exam_phase_plans enable row level security;

drop policy if exists "exam_phase_plans_select_own" on public.exam_phase_plans;
drop policy if exists "exam_phase_plans_insert_own" on public.exam_phase_plans;
drop policy if exists "exam_phase_plans_update_own" on public.exam_phase_plans;
drop policy if exists "exam_phase_plans_delete_own" on public.exam_phase_plans;

create policy "exam_phase_plans_select_own"
  on public.exam_phase_plans for select
  using (auth.uid() = user_id);

create policy "exam_phase_plans_insert_own"
  on public.exam_phase_plans for insert
  with check (auth.uid() = user_id);

create policy "exam_phase_plans_update_own"
  on public.exam_phase_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "exam_phase_plans_delete_own"
  on public.exam_phase_plans for delete
  using (auth.uid() = user_id);

comment on table public.exam_phase_plans is
  'Subject-to-phase assignments for macro year planning. Phase date ranges are computed client-side from the user exam date.';
