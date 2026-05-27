-- Optional link from unified daily plan tasks to catalog microtopics (syllabus_master).

alter table public.daily_tasks
  add column if not exists syllabus_master_id uuid references public.syllabus_master (id) on delete set null;

create index if not exists daily_tasks_syllabus_master_id_idx
  on public.daily_tasks (syllabus_master_id)
  where syllabus_master_id is not null;
