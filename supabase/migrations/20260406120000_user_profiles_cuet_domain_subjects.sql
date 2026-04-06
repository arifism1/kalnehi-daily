-- CUET: user-selected domain subjects (Physics, Chemistry, etc.) for syllabus + marks scope.
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS cuet_domain_subjects jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.user_profiles.cuet_domain_subjects IS
  'Array of domain subject names for CUET (e.g. ["Physics","Chemistry"]). Filters syllabus_master.';
