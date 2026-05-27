-- Lock down subscription/trial/usage columns on user_profiles for the PostgREST role
-- (authenticated clients). Only explicitly listed columns may be inserted/updated.
-- Service role and table owner bypass column privileges (server actions, webhooks).

-- ---------------------------------------------------------------------------
-- Welcome-trial consumption (atomic; avoids parallel double-spend on last slot)
-- Called only from service_role (subscription server actions).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.consume_welcome_trial_photo_scan(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.user_profiles%ROWTYPE;
  cap constant int := 5;
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

  IF NOT COALESCE(prof.has_used_free_trial, false) THEN
    UPDATE public.user_profiles
    SET trial_started_at = now(),
        has_used_free_trial = true,
        updated_at = now()
    WHERE user_id = p_user_id AND NOT COALESCE(has_used_free_trial, false);
    SELECT * INTO prof FROM public.user_profiles WHERE user_id = p_user_id;
  END IF;

  IF prof.trial_started_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Subscribe or start a trial to use this feature.');
  END IF;

  IF prof.trial_started_at + interval '24 hours' <= now() THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'error',
      'Your 24-hour free trial has ended. Start a 3-day paid trial to keep going.'
    );
  END IF;

  IF prof.trial_photo_scans_used >= cap THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'error',
      'You''ve used all 5 welcome photo scans for this trial.'
    );
  END IF;

  UPDATE public.user_profiles
  SET trial_photo_scans_used = trial_photo_scans_used + 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND trial_photo_scans_used < cap
  RETURNING trial_photo_scans_used INTO new_used;

  IF new_used IS NULL THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'error',
      'You''ve used all 5 welcome photo scans for this trial.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'used', new_used, 'limit', cap);
END;
$$;

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
  cap constant int := 180;
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

  IF NOT COALESCE(prof.has_used_free_trial, false) THEN
    UPDATE public.user_profiles
    SET trial_started_at = now(),
        has_used_free_trial = true,
        updated_at = now()
    WHERE user_id = p_user_id AND NOT COALESCE(has_used_free_trial, false);
    SELECT * INTO prof FROM public.user_profiles WHERE user_id = p_user_id;
  END IF;

  IF prof.trial_started_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Subscribe or start a trial to use this feature.');
  END IF;

  IF prof.trial_started_at + interval '24 hours' <= now() THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'error',
      'Your 24-hour free trial has ended. Start a 3-day paid trial to keep going.'
    );
  END IF;

  IF COALESCE(prof.trial_voice_seconds_used, 0) + add_sec > cap THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'error',
      'You''ve used all welcome voice time for this trial (3 minutes).'
    );
  END IF;

  UPDATE public.user_profiles
  SET trial_voice_seconds_used = COALESCE(trial_voice_seconds_used, 0) + add_sec,
      updated_at = now()
  WHERE user_id = p_user_id
    AND COALESCE(trial_voice_seconds_used, 0) + add_sec <= cap
  RETURNING trial_voice_seconds_used INTO new_used;

  IF new_used IS NULL THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'error',
      'You''ve used all welcome voice time for this trial (3 minutes).'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'used', new_used, 'limit', cap);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_welcome_trial_photo_scan(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_welcome_trial_voice_seconds(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_welcome_trial_photo_scan(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_welcome_trial_voice_seconds(uuid, int) TO service_role;

COMMENT ON FUNCTION public.consume_welcome_trial_photo_scan(uuid) IS
  'Atomic welcome-trial photo scan increment (service_role only).';
COMMENT ON FUNCTION public.consume_welcome_trial_voice_seconds(uuid, int) IS
  'Atomic welcome-trial voice seconds increment (service_role only).';

-- ---------------------------------------------------------------------------
-- Column-level privileges: authenticated users cannot tamper with billing/trial.
-- ---------------------------------------------------------------------------

REVOKE INSERT ON public.user_profiles FROM PUBLIC;
REVOKE UPDATE ON public.user_profiles FROM PUBLIC;
REVOKE INSERT ON public.user_profiles FROM anon, authenticated;
REVOKE UPDATE ON public.user_profiles FROM anon, authenticated;

GRANT SELECT ON public.user_profiles TO authenticated;

GRANT INSERT (
  user_id,
  full_name,
  class_studying,
  phone_number,
  primary_exam,
  target_exam,
  target_exam_date,
  cuet_domain_subjects,
  prev_exam_attempted,
  prev_score,
  prev_score_entries,
  upsc_optional_subjects,
  mandatory_onboarding_completed_at,
  enabled_features,
  updated_at
) ON public.user_profiles TO authenticated;

GRANT UPDATE (
  full_name,
  class_studying,
  phone_number,
  primary_exam,
  target_exam,
  target_exam_date,
  cuet_domain_subjects,
  prev_exam_attempted,
  prev_score,
  prev_score_entries,
  upsc_optional_subjects,
  mandatory_onboarding_completed_at,
  enabled_features,
  updated_at,
  system_push_notifications
) ON public.user_profiles TO authenticated;
