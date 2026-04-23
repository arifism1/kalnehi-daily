-- Align tasks table with the app's full TypeScript type.
--
-- 1. Add `name` column  — free-text task label; null for syllabus-linked tasks
--    that get their title from the microtopic lookup.
-- 2. Add `marks_weight` — per-task relative marks weight (optional).
-- 3. Drop NOT NULL on `microtopic_id` so free-text tasks can omit the syllabus link.
-- 4. Widen the status check constraint to accept the app's status values
--    ('pending', 'in_progress') alongside the legacy DB values
--    ('not_started', 'in_progress', 'completed').

alter table public.tasks
  add column if not exists name text,
  add column if not exists marks_weight numeric;

alter table public.tasks
  alter column microtopic_id drop not null;

-- Replace the existing status constraint (if any) with one that accepts both
-- the legacy DB values and the app-side values the client writes.
alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
    check (status in ('not_started', 'pending', 'in_progress', 'completed'));
