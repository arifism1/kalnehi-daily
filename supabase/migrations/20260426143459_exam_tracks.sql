-- Add exam track columns to user_profiles.
-- selected_track: the track ID chosen at onboarding (e.g. "jee")
-- enabled_exams_in_track: ordered subset of exam_name keys the user has enabled
--   NULL means "all exams in the track are enabled" (default after onboarding)

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS selected_track TEXT,
  ADD COLUMN IF NOT EXISTS enabled_exams_in_track TEXT[];

-- Backfill existing users: infer their track from primary_exam.
-- Users whose primary_exam does not map to any track get NULL (fall back to
-- single-exam display).
UPDATE public.user_profiles
SET
  selected_track = CASE
    WHEN primary_exam IN ('JEE Main 2025', 'JEE Advanced')             THEN 'jee'
    WHEN primary_exam IN ('GATE')                                        THEN 'gate'
    WHEN primary_exam IN ('NEET UG')                                     THEN 'neet_ug'
    WHEN primary_exam IN ('INI-CET', 'NEET PG')                         THEN 'medical_pg'
    WHEN primary_exam IN ('IPMAT Indore', 'JIPMAT', 'IPMAT Rohtak')     THEN 'management_ug'
    WHEN primary_exam IN ('CAT', 'GMAT')                                 THEN 'management_pg'
    WHEN primary_exam IN ('CA Foundation', 'CA Intermediate', 'CA Final') THEN 'ca'
    WHEN primary_exam IN ('CLAT UG')                                     THEN 'law'
    WHEN primary_exam IN ('UPSC CSE Prelims', 'UPSC CSE Mains')         THEN 'upsc'
    WHEN primary_exam IN ('NDA')                                         THEN 'defense'
    WHEN primary_exam IN ('SSC CHSL', 'SSC CGL')                        THEN 'ssc'
    WHEN primary_exam IN ('IBPS PO', 'SBI PO')                          THEN 'banking'
    WHEN primary_exam IN ('CBSE Class 12')                               THEN 'cbse'
    WHEN primary_exam IN ('SAT', 'GRE')                                  THEN 'abroad'
    WHEN primary_exam IN ('CUET')                                        THEN 'cuet'
    ELSE NULL
  END,
  -- Default enabled list = only their specific exam (not the whole track),
  -- so existing users keep seeing exactly what they had before.
  enabled_exams_in_track = CASE
    WHEN primary_exam IS NOT NULL AND primary_exam <> '' THEN ARRAY[primary_exam]
    ELSE NULL
  END
WHERE selected_track IS NULL AND primary_exam IS NOT NULL AND primary_exam <> '';
