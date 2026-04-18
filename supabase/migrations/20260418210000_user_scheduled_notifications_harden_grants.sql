-- user_scheduled_notifications: Supabase defaults grant anon DML on new tables.
-- RLS (auth.uid() = user_id) already blocks anon in practice; revoke + explicit
-- TO authenticated narrows the privilege surface and clarifies intent.

REVOKE ALL ON TABLE public.user_scheduled_notifications FROM anon;

DROP POLICY IF EXISTS "user_scheduled_notifications_select_own" ON public.user_scheduled_notifications;
CREATE POLICY "user_scheduled_notifications_select_own"
  ON public.user_scheduled_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_scheduled_notifications_insert_own" ON public.user_scheduled_notifications;
CREATE POLICY "user_scheduled_notifications_insert_own"
  ON public.user_scheduled_notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_scheduled_notifications_update_own" ON public.user_scheduled_notifications;
CREATE POLICY "user_scheduled_notifications_update_own"
  ON public.user_scheduled_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_scheduled_notifications_delete_own" ON public.user_scheduled_notifications;
CREATE POLICY "user_scheduled_notifications_delete_own"
  ON public.user_scheduled_notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
