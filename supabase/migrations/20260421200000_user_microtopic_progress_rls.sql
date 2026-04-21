-- Codifies the RLS that was previously applied manually via
-- supabase/rls-user_microtopic_progress.sql. All statements are idempotent.

alter table public.user_microtopic_progress enable row level security;

drop policy if exists "user_microtopic_progress_select_own" on public.user_microtopic_progress;
drop policy if exists "user_microtopic_progress_insert_own" on public.user_microtopic_progress;
drop policy if exists "user_microtopic_progress_update_own" on public.user_microtopic_progress;

create policy "user_microtopic_progress_select_own"
  on public.user_microtopic_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_microtopic_progress_insert_own"
  on public.user_microtopic_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_microtopic_progress_update_own"
  on public.user_microtopic_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
