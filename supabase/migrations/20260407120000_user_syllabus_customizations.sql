-- Per-user syllabus overlays (never mutates syllabus_master).
CREATE TABLE IF NOT EXISTS public.user_syllabus_customizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  exam_name text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('add', 'edit', 'delete')),
  target_type text NOT NULL CHECK (target_type IN ('microtopic', 'chapter')),
  syllabus_master_id uuid REFERENCES public.syllabus_master (id) ON DELETE CASCADE,
  custom_row_id uuid UNIQUE,
  subject text,
  chapter text,
  microtopic text,
  subject_override text,
  chapter_override text,
  microtopic_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_syllabus_customizations_user_exam_idx
  ON public.user_syllabus_customizations (user_id, exam_name);

CREATE INDEX IF NOT EXISTS user_syllabus_customizations_user_syllabus_idx
  ON public.user_syllabus_customizations (user_id, syllabus_master_id)
  WHERE syllabus_master_id IS NOT NULL;

ALTER TABLE public.user_syllabus_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own syllabus customizations"
  ON public.user_syllabus_customizations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_syllabus_customizations IS
  'add: synthetic microtopic (custom_row_id). edit: overrides for global row or chapter rename. delete: hide global microtopic or whole chapter.';

-- One active overlay per global microtopic (edit)
CREATE UNIQUE INDEX IF NOT EXISTS user_syllabus_customizations_edit_micro_unique
  ON public.user_syllabus_customizations (user_id, exam_name, syllabus_master_id)
  WHERE action_type = 'edit' AND target_type = 'microtopic' AND syllabus_master_id IS NOT NULL;

-- One hide per global microtopic
CREATE UNIQUE INDEX IF NOT EXISTS user_syllabus_customizations_delete_micro_unique
  ON public.user_syllabus_customizations (user_id, exam_name, syllabus_master_id)
  WHERE action_type = 'delete' AND target_type = 'microtopic' AND syllabus_master_id IS NOT NULL;

-- One chapter rename per (subject, original chapter)
CREATE UNIQUE INDEX IF NOT EXISTS user_syllabus_customizations_edit_chapter_unique
  ON public.user_syllabus_customizations (user_id, exam_name, subject, chapter)
  WHERE action_type = 'edit' AND target_type = 'chapter';

-- One chapter hide per (subject, chapter)
CREATE UNIQUE INDEX IF NOT EXISTS user_syllabus_customizations_delete_chapter_unique
  ON public.user_syllabus_customizations (user_id, exam_name, subject, chapter)
  WHERE action_type = 'delete' AND target_type = 'chapter';
