-- Allow authenticated users to update quick-nav preferences (server actions use the user session).
-- See 20260417120000_user_profiles_lockdown_welcome_usage_rpc.sql for column-level UPDATE grants.
GRANT UPDATE (quick_nav_hrefs) ON public.user_profiles TO authenticated;
