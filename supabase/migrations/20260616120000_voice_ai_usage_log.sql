-- Track Groq token usage for voice parsing calls.
-- Separate from prepbrain_ai_token_reservations (which covers PrepBrain/HelpyJi chat).
-- Voice features (Dictate My Day, voice commands, etc.) bill voice minutes, not
-- token quotas — so this table is purely for admin cost analytics.

CREATE TABLE IF NOT EXISTS public.voice_ai_usage_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature       text        NOT NULL,  -- 'voice_draft' | 'voice_command' | etc.
  input_tokens  int         NOT NULL DEFAULT 0,
  output_tokens int         NOT NULL DEFAULT 0,
  provider      text        NOT NULL DEFAULT 'groq',
  model         text        NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_ai_usage_log_user_created
  ON public.voice_ai_usage_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS voice_ai_usage_log_created
  ON public.voice_ai_usage_log (created_at DESC);

-- Only service-role can read/write.
ALTER TABLE public.voice_ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_voice_ai_usage_log" ON public.voice_ai_usage_log
  FOR ALL USING (false) WITH CHECK (false);

COMMENT ON TABLE public.voice_ai_usage_log IS
  'Per-call Groq token usage for voice features (Dictate My Day, voice commands, etc.). Used for admin cost analytics only.';
