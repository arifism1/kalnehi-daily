#!/usr/bin/env node
/**
 * Post-deploy / local checklist for Supabase security (complements MCP get_advisors).
 *
 * 1. Dashboard → Authentication → Password: enable "Leaked password protection"
 *    https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
 *
 * 2. Dashboard → Database → Advisors: re-run Security advisors after migrations.
 *
 * 3. Repo migrations under supabase/migrations should include RLS + policies for new tables.
 *
 * 4. SECURITY DEFINER RPCs: grant EXECUTE only to service_role unless the function enforces
 *    auth.uid() (or equivalent). See e.g. 20260710120000_assign_waitlist_position_service_role_only.sql.
 */

console.log(`Supabase security checklist:
— Enable leaked password protection (HaveIBeenPwned) in Auth settings if not already on.
— Run SQL migrations so local/staging/prod stay aligned; verify advisors show no unexpected ERROR/WARN.
— Server-only tables use explicit deny policies for anon/authenticated (service_role bypasses RLS).
— SECURITY DEFINER RPCs: prefer GRANT EXECUTE … TO service_role only unless auth.uid() is enforced inside the function.
— assign_waitlist_position: re-check grants after deploy — SELECT grantee FROM information_schema.routine_privileges WHERE routine_schema = 'public' AND routine_name = 'assign_waitlist_position'; expect service_role (and postgres), not anon/authenticated.
`);
