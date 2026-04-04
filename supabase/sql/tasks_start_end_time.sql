-- Run in Supabase SQL editor if inserts fail with:
-- "Could not find the 'end_time' column of 'tasks' in the schema cache"
-- Stores optional same-day clock times (matches app: HH:MM:SS strings).

alter table public.tasks
  add column if not exists start_time time without time zone;

alter table public.tasks
  add column if not exists end_time time without time zone;

comment on column public.tasks.start_time is 'Optional planned start time of day for the task';
comment on column public.tasks.end_time is 'Optional planned end time of day for the task';
