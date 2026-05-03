-- Recovery loop: retry metadata + optional vent audit

ALTER TABLE public.user_syllabus_backlog
  ADD COLUMN IF NOT EXISTS last_attempt_date date,
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_syllabus_backlog.last_attempt_date IS
  'Calendar date when a scheduled recovery task was missed and returned to pending.';
COMMENT ON COLUMN public.user_syllabus_backlog.retry_count IS
  'Increments when a recovery daily task is not completed by end of plan day.';

CREATE TABLE IF NOT EXISTS public.user_backlog_vents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  raw_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_backlog_vents_user_created_idx
  ON public.user_backlog_vents (user_id, created_at DESC);

ALTER TABLE public.user_backlog_vents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_backlog_vents_select_own"
  ON public.user_backlog_vents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_backlog_vents_insert_own"
  ON public.user_backlog_vents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_backlog_vents IS
  'Raw backlog vent text at commit time (audit / re-entry).';
