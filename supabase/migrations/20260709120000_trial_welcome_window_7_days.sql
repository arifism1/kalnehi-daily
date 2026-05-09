-- Extend welcome trial window from 3 to 7 days (align with src/lib/freeTrial.ts FREE_TRIAL_DAYS).

UPDATE public.admin_config
SET value = '7'
WHERE key = 'trial_duration_days';

-- ── Voice RPC ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_welcome_trial_voice_seconds(
  p_user_id uuid,
  p_add_seconds int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.user_profiles%ROWTYPE;
  cap  constant int := 300;
  add_sec int := GREATEST(0, COALESCE(p_add_seconds, 0));
  new_used int;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid user.');
  END IF;

  IF add_sec <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid voice increment.');
  END IF;

  SELECT * INTO prof FROM public.user_profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unable to check usage.');
  END IF;

  IF prof.subscription_status IN ('trial', 'active', 'cancelled')
     AND prof.subscription_end_date IS NOT NULL
     AND prof.subscription_end_date > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'use_paid_path');
  END IF;

  IF prof.trial_started_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Start your 7-day free trial to use voice.');
  END IF;

  IF prof.trial_started_at + interval '7 days' <= now() THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'Your 7-day free trial has ended. Subscribe to Smart Plan (₹399/month) to continue.'
    );
  END IF;

  IF COALESCE(prof.trial_voice_seconds_used, 0) + add_sec > cap THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'You''ve used all 5 minutes of voice included in your 7-day free trial. Upgrade to Smart Plan for 100 minutes/month.'
    );
  END IF;

  UPDATE public.user_profiles
  SET trial_voice_seconds_used = COALESCE(trial_voice_seconds_used, 0) + add_sec,
      updated_at                = now()
  WHERE user_id = p_user_id
    AND COALESCE(trial_voice_seconds_used, 0) + add_sec <= cap
  RETURNING trial_voice_seconds_used INTO new_used;

  IF new_used IS NULL THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'You''ve used all 5 minutes of voice included in your 7-day free trial. Upgrade to Smart Plan for 100 minutes/month.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'used', new_used, 'limit', cap);
END;
$$;

COMMENT ON FUNCTION public.consume_welcome_trial_voice_seconds(uuid, int) IS
  'Atomic welcome-trial voice seconds increment (service_role only). Cap 300 seconds over the 7-day free trial. Rejects if trial not explicitly started.';

-- ── Photo-scan RPC ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_welcome_trial_photo_scan(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof     public.user_profiles%ROWTYPE;
  cap      constant int := 999;
  new_used int;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid user.');
  END IF;

  SELECT * INTO prof FROM public.user_profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unable to check usage.');
  END IF;

  IF prof.subscription_status IN ('trial', 'active', 'cancelled')
     AND prof.subscription_end_date IS NOT NULL
     AND prof.subscription_end_date > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'use_paid_path');
  END IF;

  IF prof.trial_started_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Start your 7-day free trial to scan.');
  END IF;

  IF prof.trial_started_at + interval '7 days' <= now() THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'Your 7-day free trial has ended. Subscribe to Smart Plan (₹399/month) to continue.'
    );
  END IF;

  IF COALESCE(prof.trial_photo_scans_used, 0) >= cap THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'Photo scan limit reached. Upgrade to Smart Plan for unlimited access.'
    );
  END IF;

  UPDATE public.user_profiles
  SET trial_photo_scans_used = COALESCE(trial_photo_scans_used, 0) + 1,
      updated_at              = now()
  WHERE user_id = p_user_id
    AND COALESCE(trial_photo_scans_used, 0) < cap
  RETURNING trial_photo_scans_used INTO new_used;

  IF new_used IS NULL THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'Photo scan limit reached. Upgrade to Smart Plan for unlimited access.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'used', new_used, 'limit', cap);
END;
$$;

COMMENT ON FUNCTION public.consume_welcome_trial_photo_scan(uuid) IS
  'Atomic welcome-trial photo scan increment (service_role only). Cap 999 over the 7-day free trial. Rejects if trial not explicitly started.';

-- ── PrepBrain welcome phase ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._prepbrain_resolve_ai_phase(prof public.user_profiles)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  has_paid boolean;
  welcome_active boolean;
  st text;
  end_d timestamptz;
  trial_s timestamptz;
BEGIN
  st := prof.subscription_status;
  IF prof.subscription_end_date IS NOT NULL THEN
    end_d := prof.subscription_end_date::timestamptz;
  ELSE
    end_d := NULL;
  END IF;

  has_paid := (
    st IN ('trial', 'active', 'cancelled')
    AND end_d IS NOT NULL
    AND end_d > now()
  );

  IF prof.trial_started_at IS NOT NULL THEN
    trial_s := prof.trial_started_at::timestamptz;
  ELSE
    trial_s := NULL;
  END IF;

  welcome_active := (
    trial_s IS NOT NULL
    AND NOT has_paid
    AND now() < trial_s + interval '7 days'
  );

  IF welcome_active THEN
    RETURN 'welcome';
  END IF;
  IF has_paid AND st = 'trial' THEN
    RETURN 'paid_trial';
  END IF;
  IF has_paid AND st IN ('active', 'cancelled') THEN
    RETURN 'monthly';
  END IF;
  RETURN 'none';
END;
$$;
