-- Multi-exam syllabus: tag each microtopic row with a catalog exam (e.g. NEET UG, JEE Main).
-- Backfill existing rows as NEET UG; set JEE Main rows when inserting JEE data.

ALTER TABLE public.syllabus_master
ADD COLUMN IF NOT EXISTS exam_name text;

UPDATE public.syllabus_master
SET exam_name = 'NEET UG'
WHERE exam_name IS NULL;

ALTER TABLE public.syllabus_master
ALTER COLUMN exam_name SET DEFAULT 'NEET UG';

ALTER TABLE public.syllabus_master
ALTER COLUMN exam_name SET NOT NULL;

CREATE INDEX IF NOT EXISTS syllabus_master_exam_name_idx
  ON public.syllabus_master (exam_name);
