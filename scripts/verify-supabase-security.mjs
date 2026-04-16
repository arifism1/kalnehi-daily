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
 */

console.log(`Supabase security checklist:
— Enable leaked password protection (HaveIBeenPwned) in Auth settings if not already on.
— Run SQL migrations so local/staging/prod stay aligned; verify advisors show no unexpected ERROR/WARN.
— Server-only tables use explicit deny policies for anon/authenticated (service_role bypasses RLS).
`);
