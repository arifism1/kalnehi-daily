-- Backlog recovery: user syllabus backlog items + daily_tasks linkage

CREATE TABLE IF NOT EXISTS public.user_syllabus_backlog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  syllabus_master_id uuid REFERENCES public.syllabus_master (id) ON DELETE SET NULL,
  title text NOT NULL,
  details text NOT NULL DEFAULT '',
  group_label text,
  difficulty text,
  effort_estimate_minutes int,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'scheduled', 'fixed', 'dropped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_syllabus_backlog_user_status_idx
  ON public.user_syllabus_backlog (user_id, status);

CREATE INDEX IF NOT EXISTS user_syllabus_backlog_user_created_idx
  ON public.user_syllabus_backlog (user_id, created_at DESC);

ALTER TABLE public.user_syllabus_backlog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_syllabus_backlog_select_own"
  ON public.user_syllabus_backlog FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_syllabus_backlog_insert_own"
  ON public.user_syllabus_backlog FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_syllabus_backlog_update_own"
  ON public.user_syllabus_backlog FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_syllabus_backlog_delete_own"
  ON public.user_syllabus_backlog FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_syllabus_backlog IS
  'AI/user backlog items; scheduled when linked via daily_tasks.backlog_item_id.';

-- daily_tasks: backlog source, optional estimated minutes, backlog FK

ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes int;

ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS backlog_item_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'daily_tasks_backlog_item_id_fkey'
  ) THEN
    ALTER TABLE public.daily_tasks
      ADD CONSTRAINT daily_tasks_backlog_item_id_fkey
      FOREIGN KEY (backlog_item_id)
      REFERENCES public.user_syllabus_backlog (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS daily_tasks_backlog_item_id_idx
  ON public.daily_tasks (backlog_item_id)
  WHERE backlog_item_id IS NOT NULL;

ALTER TABLE public.daily_tasks DROP CONSTRAINT IF EXISTS daily_tasks_source_check;

ALTER TABLE public.daily_tasks
  ADD CONSTRAINT daily_tasks_source_check
  CHECK (source IN ('typed', 'voice', 'handwritten', 'moved', 'revision', 'backlog'));
