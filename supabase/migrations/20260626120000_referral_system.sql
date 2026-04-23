-- Referral source tracking system.
-- Adds referral attribution columns to user_profiles, creates referral_codes
-- and referral_events tables, and an RPC to attach a referral to a user at signup.
-- No changes to daily cap logic — all users remain subject to the same cap.

-- ── 1. Extend user_profiles with referral attribution fields ─────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS referral_source      text,
  ADD COLUMN IF NOT EXISTS referral_medium      text,
  ADD COLUMN IF NOT EXISTS referral_campaign    text,
  ADD COLUMN IF NOT EXISTS referral_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_url         text;

COMMENT ON COLUMN public.user_profiles.referral_source IS
  'The ref= param value from the magic link (e.g. IGTRIAL3, IGTRIAL_REEL1). Null for organic signups.';
COMMENT ON COLUMN public.user_profiles.referral_medium IS
  'utm_medium value (e.g. manychat, bio, story).';
COMMENT ON COLUMN public.user_profiles.referral_campaign IS
  'utm_campaign value (e.g. reel_comment, jee_reel_may1).';
COMMENT ON COLUMN public.user_profiles.referral_captured_at IS
  'UTC timestamp when the referral params were first captured in the browser.';
COMMENT ON COLUMN public.user_profiles.referral_url IS
  'Full original URL the user arrived on — stored for debugging and attribution analysis.';


-- ── 2. referral_codes — catalogue of known referral codes ────────────────

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL,
  description text,
  campaign    text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_code_key UNIQUE (code)
);

COMMENT ON TABLE public.referral_codes IS
  'Catalogue of referral codes sent via ManyChat / Instagram DMs. Active codes are tracked; inactive codes are stored for analysis but grant no special treatment.';
COMMENT ON COLUMN public.referral_codes.code IS
  'Short alphanumeric code (e.g. IGTRIAL3). Must be unique and URL-safe.';
COMMENT ON COLUMN public.referral_codes.campaign IS
  'Logical campaign bucket (e.g. instagram_manychat, instagram_bio).';

CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON public.referral_codes (code);
CREATE INDEX IF NOT EXISTS referral_codes_is_active_idx ON public.referral_codes (is_active);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active codes (needed for client-side validation badge).
CREATE POLICY "referral_codes_read_authenticated"
  ON public.referral_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- All writes go through service-role only.
CREATE POLICY "referral_codes_service_role_all"
  ON public.referral_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── 3. referral_events — funnel event log ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  text,
  event_type  text        NOT NULL
    CHECK (event_type IN (
      'link_clicked',
      'signup_completed',
      'trial_started',
      'converted_to_paid'
    )),
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.referral_events IS
  'Funnel event log for referral attribution. Records link clicks (anonymous), signups, trial starts, and conversions against each referral code.';
COMMENT ON COLUMN public.referral_events.user_id IS
  'Null for link_clicked events (user not yet signed up). Set on signup_completed and later events.';
COMMENT ON COLUMN public.referral_events.session_id IS
  'Anonymous client-generated UUID that links pre-signup events to the same browser session.';

CREATE INDEX IF NOT EXISTS referral_events_code_idx ON public.referral_events (code);
CREATE INDEX IF NOT EXISTS referral_events_user_id_idx ON public.referral_events (user_id);
CREATE INDEX IF NOT EXISTS referral_events_event_type_idx ON public.referral_events (event_type);
CREATE INDEX IF NOT EXISTS referral_events_created_at_idx ON public.referral_events (created_at DESC);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

-- Service-role only — all access via RPCs or server-side service-role client.
CREATE POLICY "referral_events_service_role_all"
  ON public.referral_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── 4. attach_referral_to_user RPC ───────────────────────────────────────
--
-- Called server-side after a user successfully signs up.
-- Validates the referral code, writes attribution columns to user_profiles,
-- and logs a signup_completed event.
-- Does NOT modify trial_access_type — daily cap applies to all users equally.

CREATE OR REPLACE FUNCTION public.attach_referral_to_user(
  p_user_id     uuid,
  p_code        text,
  p_utm_source  text DEFAULT NULL,
  p_utm_medium  text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_ref_url     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_active  boolean;
  v_already_set  boolean;
BEGIN
  IF p_user_id IS NULL OR p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_params');
  END IF;

  -- Check if referral_source is already set (idempotent).
  SELECT (referral_source IS NOT NULL)
  INTO v_already_set
  FROM public.user_profiles
  WHERE user_id = p_user_id;

  IF v_already_set THEN
    RETURN jsonb_build_object('ok', true, 'valid_code', false, 'skipped', 'already_set');
  END IF;

  -- Check if the code exists and is active.
  SELECT is_active
  INTO v_code_active
  FROM public.referral_codes
  WHERE code = upper(trim(p_code));

  -- Store referral attribution regardless of whether the code is valid —
  -- we want to track all referral sources for analysis.
  UPDATE public.user_profiles
  SET
    referral_source      = upper(trim(p_code)),
    referral_medium      = nullif(trim(coalesce(p_utm_medium, '')), ''),
    referral_campaign    = nullif(trim(coalesce(p_utm_campaign, '')), ''),
    referral_captured_at = now(),
    referral_url         = nullif(trim(coalesce(p_ref_url, '')), ''),
    updated_at           = now()
  WHERE user_id = p_user_id;

  -- Log the signup_completed event.
  INSERT INTO public.referral_events (code, user_id, session_id, event_type, metadata)
  VALUES (
    upper(trim(p_code)),
    p_user_id,
    NULL,
    'signup_completed',
    jsonb_build_object(
      'utm_source',   coalesce(p_utm_source, ''),
      'utm_medium',   coalesce(p_utm_medium, ''),
      'utm_campaign', coalesce(p_utm_campaign, ''),
      'valid_code',   coalesce(v_code_active, false)
    )
  );

  RETURN jsonb_build_object(
    'ok',         true,
    'valid_code', coalesce(v_code_active, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_referral_to_user(uuid, text, text, text, text, text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.attach_referral_to_user(uuid, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;


-- ── 5. Seed initial referral codes ───────────────────────────────────────
--
-- ManyChat URL format:
--   kalnehi.com/start?ref=IGTRIAL3&utm_source=instagram&utm_medium=manychat&utm_campaign=reel_comment
--
-- Add more codes from the admin /admin/referrals page as campaigns grow.

INSERT INTO public.referral_codes (code, description, campaign, is_active)
VALUES
  ('IGTRIAL',       'Generic Instagram trial link',       'instagram_manychat', true),
  ('IGTRIAL3',      'ManyChat 3-day trial standard',      'instagram_manychat', true),
  ('IGTRIAL_BIO',   'Instagram bio link',                 'instagram_bio',      true),
  ('IGTRIAL_REEL1', 'First reel campaign',                'instagram_manychat', true),
  ('IGTRIAL_REEL2', 'Second reel campaign',               'instagram_manychat', true),
  ('IGTRIAL_STORY', 'Instagram stories',                  'instagram_story',    true)
ON CONFLICT (code) DO NOTHING;
