-- Supabase Security Advisor:
-- 1) Mutable search_path on functions (lint 0011) — lock to public schema.
-- 2) RLS enabled with no policies (lint 0008) on server-only tables — explicit
--    deny for anon/authenticated; service_role still bypasses RLS as intended.

ALTER FUNCTION public.get_gated_predicted_score(uuid) SET search_path = public;

ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Server-only tables (written via service role from Next.js API routes).
-- DROP IF EXISTS keeps this migration safe to re-run (e.g. partial failure in SQL Editor).
DROP POLICY IF EXISTS "helpyji_daily_usage_deny_anon_authenticated"
  ON public.helpyji_daily_usage;
CREATE POLICY "helpyji_daily_usage_deny_anon_authenticated"
  ON public.helpyji_daily_usage
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "prepbrain_chat_cooldown_deny_anon_authenticated"
  ON public.prepbrain_chat_cooldown;
CREATE POLICY "prepbrain_chat_cooldown_deny_anon_authenticated"
  ON public.prepbrain_chat_cooldown
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "razorpay_processed_payments_deny_anon_authenticated"
  ON public.razorpay_processed_payments;
CREATE POLICY "razorpay_processed_payments_deny_anon_authenticated"
  ON public.razorpay_processed_payments
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "user_automated_push_daily_deny_anon_authenticated"
  ON public.user_automated_push_daily;
CREATE POLICY "user_automated_push_daily_deny_anon_authenticated"
  ON public.user_automated_push_daily
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "user_system_push_dedupe_deny_anon_authenticated"
  ON public.user_system_push_dedupe;
CREATE POLICY "user_system_push_dedupe_deny_anon_authenticated"
  ON public.user_system_push_dedupe
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
