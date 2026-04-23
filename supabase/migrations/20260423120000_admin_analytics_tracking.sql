-- Admin analytics: product events, outbound notification tracking, support notes.
-- Service-role only (RLS deny-all); app writes via trusted server routes later.

-- ── feature_events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  feature     text NOT NULL,
  event       text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.feature_events IS
  'Product analytics events (onboarding, PrepBrain, paywall, etc.). Insert from server or authenticated API only.';

CREATE INDEX IF NOT EXISTS feature_events_user_created_idx
  ON public.feature_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feature_events_feature_event_created_idx
  ON public.feature_events (feature, event, created_at DESC);

ALTER TABLE public.feature_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_feature_events" ON public.feature_events
  FOR ALL USING (false) WITH CHECK (false);


-- ── notification_sends ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_sends (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  channel            text NOT NULL CHECK (channel IN ('push', 'email', 'whatsapp', 'in_app')),
  notification_type  text NOT NULL,
  sent_at            timestamptz NOT NULL DEFAULT now(),
  delivered_at       timestamptz,
  opened_at          timestamptz,
  clicked_at         timestamptz,
  converted_at       timestamptz
);

COMMENT ON TABLE public.notification_sends IS
  'Outbound notification funnel: send → deliver → open → click → attributed conversion.';

CREATE INDEX IF NOT EXISTS notification_sends_user_sent_idx
  ON public.notification_sends (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS notification_sends_type_sent_idx
  ON public.notification_sends (notification_type, sent_at DESC);

ALTER TABLE public.notification_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_notification_sends" ON public.notification_sends
  FOR ALL USING (false) WITH CHECK (false);


-- ── admin_user_support_notes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_user_support_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  note        text NOT NULL,
  created_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_user_support_notes_user_idx
  ON public.admin_user_support_notes (user_id, created_at DESC);

ALTER TABLE public.admin_user_support_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_admin_user_support_notes" ON public.admin_user_support_notes
  FOR ALL USING (false) WITH CHECK (false);
