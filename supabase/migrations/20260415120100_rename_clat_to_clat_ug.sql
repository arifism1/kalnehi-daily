-- Align catalog and profiles with syllabus_master.exam_name = 'CLAT UG'.

UPDATE public.user_profiles
SET target_exam = 'CLAT UG'
WHERE target_exam = 'CLAT';

UPDATE public.user_profiles
SET primary_exam = 'CLAT UG'
WHERE primary_exam = 'CLAT';

UPDATE public.exams
SET
  exam_name = 'CLAT UG',
  display_name = 'CLAT UG'
WHERE exam_name = 'CLAT';
