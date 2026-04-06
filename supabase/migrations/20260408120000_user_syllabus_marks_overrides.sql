-- Per-user marks weights per syllabus row (never mutates syllabus_master).
CREATE TABLE IF NOT EXISTS public.user_syllabus_marks_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  exam_name text NOT NULL,
  syllabus_master_id uuid NOT NULL,
  marks_2025 numeric,
  marks_2024 numeric,
  marks_2023 numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_syllabus_marks_overrides_user_row_unique UNIQUE (user_id, syllabus_master_id)
);

CREATE INDEX IF NOT EXISTS user_syllabus_marks_overrides_user_exam_idx
  ON public.user_syllabus_marks_overrides (user_id, exam_name);

COMMENT ON TABLE public.user_syllabus_marks_overrides IS
  'NULL in a marks column means use syllabus_master for that year; all-NULL row should be deleted.';

ALTER TABLE public.user_syllabus_marks_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own syllabus marks overrides"
  ON public.user_syllabus_marks_overrides
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
