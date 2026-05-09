-- Lock down assign_waitlist_position: SECURITY DEFINER + EXECUTE for authenticated
-- allowed any logged-in user to call PostgREST with arbitrary p_user_id (no auth.uid() check).
-- The app only invokes this RPC via service_role in src/app/api/waitlist/join/route.ts.
--
-- Note: Do NOT add FK waitlist_entries.user_id -> auth.users: unauthenticated joins use a
-- synthetic UUID derived from email (see join route), not an auth.users row.

-- Drop legacy 4-arg overload if it still exists (5-arg version added in 20260610120000).
DROP FUNCTION IF EXISTS public.assign_waitlist_position(uuid, uuid, text, text);

REVOKE ALL ON FUNCTION public.assign_waitlist_position(uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_waitlist_position(uuid, uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.assign_waitlist_position(uuid, uuid, text, text, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.assign_waitlist_position(uuid, uuid, text, text, text) TO service_role;

COMMENT ON FUNCTION public.assign_waitlist_position(uuid, uuid, text, text, text) IS
  'Atomically assigns waitlist position. Callable only with service_role (Next.js server); not exposed to authenticated JWT.';
