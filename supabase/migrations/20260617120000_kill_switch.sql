-- Global kill switch, feature flags, and audit log.
-- app_config: single-row table enforced by trigger.
-- feature_flags: one row per feature for granular on/off control.
-- app_config_log: append-only audit trail — never delete.

-- ── app_config ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_config (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  app_enabled         boolean     NOT NULL DEFAULT true,
  maintenance_message text        NOT NULL DEFAULT 'Kalnehi Daily is temporarily unavailable. We will be back shortly.',
  maintenance_title   text        NOT NULL DEFAULT 'Back soon.',
  maintenance_eta     text,
  disabled_at         timestamptz,
  disabled_by         uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
  re_enabled_at       timestamptz,
  re_enabled_by       uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_config IS
  'Single-row global kill switch. Use the trigger to enforce the one-row constraint.';

-- Enforce exactly one row via trigger (cleaner than a check constraint alone).
CREATE OR REPLACE FUNCTION public.app_config_single_row()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.app_config) > 0 THEN
    RAISE EXCEPTION 'app_config must contain exactly one row. Use UPDATE instead of INSERT.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_app_config_single_row ON public.app_config;
CREATE TRIGGER enforce_app_config_single_row
  BEFORE INSERT ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.app_config_single_row();

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Any authenticated user (and anon) can read app_enabled so the kill switch check works.
CREATE POLICY "read_app_enabled" ON public.app_config
  FOR SELECT USING (true);

-- Only service-role can write.
CREATE POLICY "service_role_app_config_write" ON public.app_config
  FOR ALL USING (false) WITH CHECK (false);

-- Insert the default row (app is live).
INSERT INTO public.app_config (app_enabled)
VALUES (true)
ON CONFLICT DO NOTHING;


-- ── feature_flags ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key      text        NOT NULL UNIQUE,
  enabled          boolean     NOT NULL DEFAULT true,
  description      text        NOT NULL DEFAULT '',
  disabled_message text,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid        REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.feature_flags IS
  'Per-feature on/off flags. Disable a feature instantly without a full app outage.';

CREATE INDEX IF NOT EXISTS feature_flags_key_idx ON public.feature_flags (feature_key);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (needed for /api/feature-flags endpoint).
CREATE POLICY "authed_read_feature_flags" ON public.feature_flags
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only service-role can write.
CREATE POLICY "service_role_feature_flags_write" ON public.feature_flags
  FOR ALL USING (false) WITH CHECK (false);

-- Seed the 9 core feature flags.
INSERT INTO public.feature_flags (feature_key, enabled, description) VALUES
  ('prepbrain_ai',   true, 'PrepBrain AI coach'),
  ('voice_control',  true, 'Voice commands and dictation'),
  ('marks_engine',   true, 'Marks engine and rank prediction'),
  ('spaced_revision',true, 'Spaced revision engine'),
  ('study_camera',   true, 'On-camera study sessions'),
  ('batch_system',   true, 'Batch opening and waitlist processing'),
  ('payments',       true, 'Razorpay payment processing'),
  ('notifications',  true, 'All outbound notifications'),
  ('new_signups',    true, 'New user registration')
ON CONFLICT (feature_key) DO NOTHING;


-- ── app_config_log ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_config_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action       text        NOT NULL,
  performed_by uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  old_value    jsonb,
  new_value    jsonb,
  reason       text
);

COMMENT ON TABLE public.app_config_log IS
  'Append-only audit log for all app_config and feature_flags changes. Never delete rows.';

CREATE INDEX IF NOT EXISTS app_config_log_performed_at_idx
  ON public.app_config_log (performed_at DESC);

ALTER TABLE public.app_config_log ENABLE ROW LEVEL SECURITY;

-- Service-role only — reads happen via service-role client in admin API routes.
CREATE POLICY "service_role_app_config_log" ON public.app_config_log
  FOR ALL USING (false) WITH CHECK (false);
