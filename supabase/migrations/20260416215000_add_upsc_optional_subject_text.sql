-- Add upsc_optional_subject (text, nullable) — the canonical single-choice column.
-- Migrates any existing data from the old text[] array column.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS upsc_optional_subject text null;

-- Copy the first element of the legacy array to the new column for existing rows.
UPDATE public.user_profiles
SET upsc_optional_subject = upsc_optional_subjects[1]
WHERE upsc_optional_subjects IS NOT NULL
  AND array_length(upsc_optional_subjects, 1) > 0
  AND upsc_optional_subject IS NULL;
