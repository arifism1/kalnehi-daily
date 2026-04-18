-- Shared AI token budget: 2,000,000 tokens per user per calendar month.
-- Used jointly by PrepBrain and HelpyJi. Resets to 0 on the 1st of each month
-- via the Vercel Cron job at /api/cron/reset-ai-tokens.
--
-- The prior per-feature columns (prepbrain_tokens_used / prepbrain_tokens_month)
-- are left in place for backward-compatibility and historical reference.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ai_tokens_used  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_tokens_month text;

COMMENT ON COLUMN public.user_profiles.ai_tokens_used IS
  'Total Groq tokens (prompt + completion) consumed across all AI features '
  '(PrepBrain + HelpyJi combined) in the current ai_tokens_month. '
  'Hard cap: 2,000,000 per calendar month. Reset to 0 by Vercel Cron on the 1st of each month.';

COMMENT ON COLUMN public.user_profiles.ai_tokens_month IS
  'Calendar month key YYYY-MM (Asia/Kolkata) that ai_tokens_used applies to. '
  'Cleared to NULL by Vercel Cron on the 1st of each month.';
