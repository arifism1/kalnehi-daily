-- HelpyJi sales chat: daily message counts per identity (UTC calendar day).
-- Access: service role only from /api/helpyji/chat; RLS enabled with no policies.

CREATE TABLE public.helpyji_daily_usage (
  subject_key text NOT NULL,
  day date NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  CONSTRAINT helpyji_daily_usage_pkey PRIMARY KEY (subject_key, day)
);

COMMENT ON TABLE public.helpyji_daily_usage IS
  'Daily HelpyJi chat completions per subject_key: user:<uuid> or anon:<uuid>. Day is UTC date. Server-only.';

ALTER TABLE public.helpyji_daily_usage ENABLE ROW LEVEL SECURITY;
