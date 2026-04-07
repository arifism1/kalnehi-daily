-- Multiple labeled previous scores (e.g. "UPSC Pre 2025", marks).
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS prev_score_entries jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.user_profiles.prev_score_entries IS
  'JSON array of { "label": string, "score": number } for past attempts. Legacy prev_score kept in sync with first entry when possible.';
