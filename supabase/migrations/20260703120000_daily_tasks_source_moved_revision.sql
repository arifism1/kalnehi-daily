-- Extend daily_tasks.source allowed values to include 'moved' and 'revision'.
-- The original check (20260418120000) only allowed typed / voice / handwritten,
-- but insertDailyTask already passes source: 'moved' and the new revision bridge
-- uses source: 'revision'. This migration drops the stale inline check and
-- re-adds it with the full set of allowed values.

alter table public.daily_tasks
  drop constraint if exists daily_tasks_source_check;

alter table public.daily_tasks
  add constraint daily_tasks_source_check
    check (source in ('typed', 'voice', 'handwritten', 'moved', 'revision'));
