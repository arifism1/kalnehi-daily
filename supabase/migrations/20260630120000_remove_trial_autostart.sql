-- Remove silent auto-start from trial RPCs.
-- Previously, consume_welcome_trial_voice_seconds and consume_welcome_trial_photo_scan
-- would auto-set trial_started_at on first use when has_used_free_trial = false.
-- This bypassed the explicit "Start Free Trial" button entirely.
-- Now both RPCs hard-reject if trial_started_at IS NULL, forcing users to start
-- the trial explicitly via ensureFreeTrialStarted before consuming trial resources.

-- ── 1. Voice RPC ─────────────────────────────────────────────────────────────
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
  cap  constant int := 300;   -- 5 minutes for the 3-day free trial
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

  -- Paid subscriber: caller should use the paid voice path instead.
  IF prof.subscription_status IN ('trial', 'active', 'cancelled')
     AND prof.subscription_end_date IS NOT NULL
     AND prof.subscription_end_date > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'use_paid_path');
  END IF;

  -- Trial must be explicitly started via ensureFreeTrialStarted before voice can be used.
  IF prof.trial_started_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Start your 3-day free trial to use voice.');
  END IF;

  -- 3-day trial window (matches FREE_TRIAL_MS in freeTrial.ts).
  IF prof.trial_started_at + interval '3 days' <= now() THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'Your 3-day free trial has ended. Subscribe to Smart Plan (₹399/month) to continue.'
    );
  END IF;

  IF COALESCE(prof.trial_voice_seconds_used, 0) + add_sec > cap THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'You''ve used all 5 minutes of voice included in your 3-day free trial. Upgrade to Smart Plan for 100 minutes/month.'
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
      'error', 'You''ve used all 5 minutes of voice included in your 3-day free trial. Upgrade to Smart Plan for 100 minutes/month.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'used', new_used, 'limit', cap);
END;
$$;

COMMENT ON FUNCTION public.consume_welcome_trial_voice_seconds(uuid, int) IS
  'Atomic welcome-trial voice seconds increment (service_role only). Cap 300 seconds = 5 minutes over the 3-day free trial. Rejects if trial not explicitly started.';

-- ── 2. Photo-scan RPC ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_welcome_trial_photo_scan(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof     public.user_profiles%ROWTYPE;
  cap      constant int := 999;   -- effectively unlimited during the 3-day trial
  new_used int;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid user.');
  END IF;

  SELECT * INTO prof FROM public.user_profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unable to check usage.');
  END IF;

  -- Paid subscriber: caller should use the paid path.
  IF prof.subscription_status IN ('trial', 'active', 'cancelled')
     AND prof.subscription_end_date IS NOT NULL
     AND prof.subscription_end_date > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'use_paid_path');
  END IF;

  -- Trial must be explicitly started via ensureFreeTrialStarted before photo scans can be used.
  IF prof.trial_started_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Start your 3-day free trial to scan.');
  END IF;

  -- 3-day trial window (matches FREE_TRIAL_MS in freeTrial.ts).
  IF prof.trial_started_at + interval '3 days' <= now() THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'Your 3-day free trial has ended. Subscribe to Smart Plan (₹399/month) to continue.'
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
  'Atomic welcome-trial photo scan increment (service_role only). Cap 999 (unlimited) over the 3-day free trial. Rejects if trial not explicitly started.';
