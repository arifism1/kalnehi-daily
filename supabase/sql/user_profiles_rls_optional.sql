-- user_profiles RLS is applied in repo migration:
--   supabase/migrations/20260431130000_prepbrain_chat_cooldown_and_user_profiles_rls.sql
--
-- This file remains as a manual reference / one-off copy for the SQL Editor if you
-- need the same policies without re-running the full migration chain.

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_profiles_delete_own" on public.user_profiles;
create policy "user_profiles_delete_own"
  on public.user_profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);
