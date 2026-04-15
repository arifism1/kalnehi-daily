-- CA Foundation: catalog row aligned with syllabus_master.exam_name seed.
INSERT INTO public.exams (exam_name, display_name, sort_order, max_score, multi_subject)
VALUES ('CA Foundation', 'CA Foundation', 65, 400, false)
ON CONFLICT (exam_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  sort_order = EXCLUDED.sort_order,
  max_score = EXCLUDED.max_score,
  multi_subject = EXCLUDED.multi_subject;
