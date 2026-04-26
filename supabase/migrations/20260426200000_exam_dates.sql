-- Per-exam date storage. Keys are exam labels as stored in enabled_exams_in_track.
-- target_exam_date is kept for backward compat (= primary exam's date).
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS exam_dates jsonb DEFAULT NULL;

GRANT UPDATE (exam_dates) ON public.user_profiles TO authenticated;
GRANT INSERT (exam_dates) ON public.user_profiles TO authenticated;
