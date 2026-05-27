-- Update 3-day free trial voice cap from 300s (5 min) to 720s (12 min).
-- Update trial window from 24 hours to 3 days to match freeTrial.ts FREE_TRIAL_MS.
-- Update all user-facing error messages to reflect new plan structure (Smart Plan ₹499/month).

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
  cap constant int := 720;  -- 12 minutes
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

  -- 3-day trial window (matches FREE_TRIAL_MS in freeTrial.ts)
  IF prof.trial_started_at + interval '3 days' <= now() THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'error',
      'Your 3-day free trial has ended. Subscribe to Smart Plan (₹499/month) to continue.'
    );
  END IF;

  IF COALESCE(prof.trial_voice_seconds_used, 0) + add_sec > cap THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'error',
      'You''ve used all 12 minutes of voice included in your 3-day free trial. Upgrade to Smart Plan for 100 hours/month.'
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
      'You''ve used all 12 minutes of voice included in your 3-day free trial. Upgrade to Smart Plan for 100 hours/month.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'used', new_used, 'limit', cap);
END;
$$;

-- Update welcome AI token cap comment to reflect new 60k limit
COMMENT ON COLUMN public.user_profiles.welcome_ai_tokens_used IS
  'Groq tokens used during the 3-day free trial (cap 60,000). Not reset when moving to Smart Plan.';
