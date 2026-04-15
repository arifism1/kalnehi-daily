-- Full exam catalog expansion: grouped in app UI; exam_name stays aligned with syllabus_master for live exams.
-- CUET: display_name "CUET UG", exam_name remains "CUET".

INSERT INTO public.exams (exam_name, display_name, sort_order, max_score, multi_subject)
VALUES
  ('JEE Main 2025', 'JEE Main', 11, 300, false),
  ('JEE Advanced', 'JEE Advanced', 12, 360, false),
  ('GATE', 'GATE', 13, 100, false),
  ('NEET UG', 'NEET UG', 21, 720, false),
  ('NEET PG', 'NEET PG', 22, 800, false),
  ('INI-CET', 'INI-CET', 23, 800, false),
  ('CAT', 'CAT', 31, 198, false),
  ('GMAT', 'GMAT', 32, 805, false),
  ('CA Foundation', 'CA Foundation', 41, 400, false),
  ('CA Intermediate', 'CA Intermediate', 42, 800, false),
  ('CA Final', 'CA Final', 43, 800, false),
  ('CLAT UG', 'CLAT UG', 44, 120, false),
  ('UPSC CSE Prelims', 'UPSC CSE Prelims', 51, 400, false),
  ('NDA', 'NDA', 52, 900, false),
  ('SAT', 'SAT', 61, 1600, false),
  ('GRE', 'GRE', 62, 340, false),
  ('CBSE Class 12', 'CBSE Class 12', 63, 500, false),
  ('CUET', 'CUET UG', 70, null, true),
  ('Other', 'Other', 999, null, false)
ON CONFLICT (exam_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  sort_order = EXCLUDED.sort_order,
  max_score = EXCLUDED.max_score,
  multi_subject = EXCLUDED.multi_subject;
