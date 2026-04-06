-- Canonical exam list for profile dropdowns; `exam_name` matches `syllabus_master.exam_name`.
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  max_score int,
  multi_subject boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exams catalog"
  ON public.exams
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.exams IS
  'Target exam catalog: exam_name is stored on user_profiles.target_exam and filters syllabus_master.';

INSERT INTO public.exams (exam_name, display_name, sort_order, max_score, multi_subject)
VALUES
  ('NEET UG', 'NEET UG', 10, 720, false),
  ('NEET PG', 'NEET PG', 20, 800, false),
  ('JEE Main 2025', 'JEE Main', 30, 300, false),
  ('JEE Advanced', 'JEE Advanced', 40, 360, false),
  ('CUET', 'CUET', 50, null, true),
  ('CBSE Class 12', 'CBSE Class 12', 60, 500, false),
  ('UPSC CSE Prelims', 'UPSC CSE Prelims', 70, 400, false),
  ('Other', 'Other', 999, null, false)
ON CONFLICT (exam_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  sort_order = EXCLUDED.sort_order,
  max_score = COALESCE(public.exams.max_score, EXCLUDED.max_score),
  multi_subject = EXCLUDED.multi_subject;
