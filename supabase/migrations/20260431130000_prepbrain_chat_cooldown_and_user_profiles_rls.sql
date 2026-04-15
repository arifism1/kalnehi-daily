-- PrepBrain: cross-instance short cooldown between chat completions (service role from API only).
CREATE TABLE public.prepbrain_chat_cooldown (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  last_request_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prepbrain_chat_cooldown IS
  'Last PrepBrain chat API request time per user; used for multi-instance rate limiting. Server-only.';

ALTER TABLE public.prepbrain_chat_cooldown ENABLE ROW LEVEL SECURITY;

-- Defense in depth: anon/authenticated clients do not access this table (service role bypasses RLS).

-- user_profiles: ensure each authenticated user only accesses their own row via PostgREST.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_profiles_delete_own" ON public.user_profiles;
CREATE POLICY "user_profiles_delete_own"
  ON public.user_profiles FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
