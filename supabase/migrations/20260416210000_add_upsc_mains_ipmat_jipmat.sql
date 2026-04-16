-- Add UPSC CSE Mains, IPMAT Indore, IPMAT Rohtak, JIPMAT to exams catalog.
-- Also fix NDA sort_order conflict (was 52 in prior migration, intended 53).

UPDATE public.exams SET sort_order = 53 WHERE exam_name = 'NDA';

INSERT INTO public.exams (exam_name, display_name, sort_order, max_score, multi_subject)
VALUES
  ('UPSC CSE Mains', 'UPSC CSE Mains', 52, 1750, true),
  ('IPMAT Indore',   'IPMAT Indore',   33, 300,  false),
  ('IPMAT Rohtak',   'IPMAT Rohtak',   34, 300,  false),
  ('JIPMAT',         'JIPMAT',         35, 400,  false)
ON CONFLICT (exam_name) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  sort_order    = EXCLUDED.sort_order,
  max_score     = EXCLUDED.max_score,
  multi_subject = EXCLUDED.multi_subject;
