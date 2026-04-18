-- Live DB drift: several SECURITY DEFINER RPCs were executable by anon/authenticated,
-- allowing cross-user calls (arbitrary p_user_id / target_user_id). App code invokes these
-- only via service_role (Next.js server) or, for fetch_task_sessions_for_log, as authenticated
-- with auth.uid() enforced inside the function — that one is intentionally unchanged.
--
-- Also: auth_rate_limit_config had policies but RLS disabled (Supabase linter 0007).

ALTER TABLE public.auth_rate_limit_config ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Restrict overly-broad EXECUTE (restore intent of earlier migrations).
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.consume_welcome_trial_photo_scan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_welcome_trial_photo_scan(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.consume_welcome_trial_voice_seconds(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_welcome_trial_voice_seconds(uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.auth_rate_limit_step(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_rate_limit_step(text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.auth_rate_limit_password_reset(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_rate_limit_password_reset(text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.get_gated_predicted_score(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_gated_predicted_score(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.prepbrain_marks_intelligence(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepbrain_marks_intelligence(uuid, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.try_consume_automated_push_budget(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_consume_automated_push_budget(uuid, text, integer) TO service_role;
REVOKE ALL ON FUNCTION public.refund_automated_push_budget(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_automated_push_budget(uuid, text) TO service_role;
