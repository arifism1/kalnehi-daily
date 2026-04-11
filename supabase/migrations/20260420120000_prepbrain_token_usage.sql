-- PrepBrain AI: monthly Groq token totals per user (calendar month, Asia/Kolkata).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS prepbrain_tokens_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prepbrain_tokens_month text;

COMMENT ON COLUMN public.user_profiles.prepbrain_tokens_used IS
  'Total Groq tokens (prompt + completion) counted for PrepBrain AI in prepbrain_tokens_month.';
COMMENT ON COLUMN public.user_profiles.prepbrain_tokens_month IS
  'Calendar month key YYYY-MM (Asia/Kolkata) for which prepbrain_tokens_used applies; resets when month changes.';
