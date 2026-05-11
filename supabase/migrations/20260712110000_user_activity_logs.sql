-- User activity logs: per-user in-app activity for analytics and admin review.
-- Records page views and key feature actions with session grouping.
-- RLS deny-all: only service role may read; inserts via /api/activity/track (auth-verified).

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id  text        NOT NULL,
  page        text        NOT NULL,
  feature     text,
  action      text        NOT NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  platform    text        NOT NULL DEFAULT 'web',
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_activity_logs IS
  'Per-user in-app activity log: page views, feature usage, key actions. Insert from /api/activity/track only.';

COMMENT ON COLUMN public.user_activity_logs.session_id IS 'Client sessionStorage UUID, reset on each new browser/tab session.';
COMMENT ON COLUMN public.user_activity_logs.page       IS 'Next.js pathname at time of event, e.g. /home, /daily-plan.';
COMMENT ON COLUMN public.user_activity_logs.feature    IS 'Logical feature grouping: task, backlog, prepbrain, planner, etc.';
COMMENT ON COLUMN public.user_activity_logs.action     IS 'Event name: page_view, task_created, task_completed, ai_chat_sent, etc.';
COMMENT ON COLUMN public.user_activity_logs.platform   IS 'web | ios_pwa | android_pwa';

-- Primary query pattern: per-user timeline
CREATE INDEX IF NOT EXISTS user_activity_logs_user_created_idx
  ON public.user_activity_logs (user_id, created_at DESC);

-- Admin-wide recency queries
CREATE INDEX IF NOT EXISTS user_activity_logs_created_idx
  ON public.user_activity_logs (created_at DESC);

-- Feature / action aggregates
CREATE INDEX IF NOT EXISTS user_activity_logs_action_created_idx
  ON public.user_activity_logs (action, created_at DESC);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_user_activity_logs" ON public.user_activity_logs
  FOR ALL USING (false) WITH CHECK (false);
