-- PrepBrain: persisted chat threads and messages (reads via RLS; writes via service role in API).

CREATE TABLE public.prepbrain_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prepbrain_conversations IS
  'PrepBrain chat threads; inserts/updates from /api/prepbrain/chat via service role.';

CREATE INDEX prepbrain_conversations_user_updated_idx
  ON public.prepbrain_conversations (user_id, updated_at DESC);

CREATE TABLE public.prepbrain_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.prepbrain_conversations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  message_role text NOT NULL CHECK (message_role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2500),
  position int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prepbrain_messages IS
  'PrepBrain chat messages; written only from /api/prepbrain/chat via service role.';

CREATE INDEX prepbrain_messages_conversation_position_idx
  ON public.prepbrain_messages (conversation_id, position);

CREATE INDEX prepbrain_messages_user_created_idx
  ON public.prepbrain_messages (user_id, created_at DESC);

ALTER TABLE public.prepbrain_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prepbrain_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prepbrain_conversations_select_own"
  ON public.prepbrain_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "prepbrain_messages_select_own"
  ON public.prepbrain_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY "prepbrain_conversations_select_own" ON public.prepbrain_conversations IS
  'Owner can list/open threads; writes via service role in API.';
COMMENT ON POLICY "prepbrain_messages_select_own" ON public.prepbrain_messages IS
  'Owner can load messages; writes via service role in API.';

REVOKE INSERT, UPDATE, DELETE ON public.prepbrain_conversations FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.prepbrain_messages FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.prepbrain_conversations TO authenticated;
GRANT SELECT ON public.prepbrain_messages TO authenticated;
