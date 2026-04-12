-- HelpyJi: one row per message for analytics (server-side only; RLS enabled, no client policies).

CREATE TABLE public.helpyji_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  message_role text NOT NULL CHECK (message_role IN ('user', 'assistant')),
  content text NOT NULL,
  surface text NOT NULL CHECK (surface IN ('pricing', 'upgrade')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.helpyji_conversations IS
  'HelpyJi chat messages for analysis; written only from /api/helpyji/chat via service role.';

CREATE INDEX helpyji_conversations_user_created_idx
  ON public.helpyji_conversations (user_id, created_at DESC);

CREATE INDEX helpyji_conversations_session_idx
  ON public.helpyji_conversations (session_id);

ALTER TABLE public.helpyji_conversations ENABLE ROW LEVEL SECURITY;
