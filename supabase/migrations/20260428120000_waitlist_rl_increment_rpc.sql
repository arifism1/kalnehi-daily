-- Atomic per-IP attempt counter for POST /api/waitlist/join rate limiting.
-- Fixes: upsert with constant attempt_count=1 was resetting the counter on
-- every conflict, so the > 5 guard never fired after the first request.
CREATE OR REPLACE FUNCTION public.increment_waitlist_join_attempt(
  p_ip_hash      text,
  p_window_start timestamptz
) RETURNS integer
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
AS $$
  INSERT INTO public.waitlist_join_rate_limits (ip_hash, window_start, attempt_count)
  VALUES (p_ip_hash, p_window_start, 1)
  ON CONFLICT (ip_hash, window_start)
  DO UPDATE SET attempt_count = waitlist_join_rate_limits.attempt_count + 1
  RETURNING attempt_count;
$$;

COMMENT ON FUNCTION public.increment_waitlist_join_attempt IS
  'Atomically inserts or increments the per-IP attempt counter for the waitlist
   join rate limit. Returns the new attempt_count. SECURITY DEFINER so the
   service-role caller does not need direct table access beyond RLS.';

REVOKE ALL ON FUNCTION public.increment_waitlist_join_attempt FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_waitlist_join_attempt TO service_role;
