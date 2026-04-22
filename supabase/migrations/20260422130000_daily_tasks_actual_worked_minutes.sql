-- Track minutes logged by the per-task Daily Plan timer (optional; default 0).
ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS actual_worked_minutes integer NOT NULL DEFAULT 0
  CHECK (actual_worked_minutes >= 0);

COMMENT ON COLUMN public.daily_tasks.actual_worked_minutes IS
  'Cumulative minutes from the Daily Plan task timer; 0 if never used.';
