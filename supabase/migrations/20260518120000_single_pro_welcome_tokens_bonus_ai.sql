-- Single Pro: welcome / paid-trial AI token counters, bonus AI token ledger, cancel snapshots for resubscribe grace.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS welcome_ai_tokens_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_trial_ai_tokens_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_ai_tokens_ledger jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bonus_ai_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS bonus_voice_minutes_ledger_at_cancel jsonb,
  ADD COLUMN IF NOT EXISTS bonus_ai_tokens_ledger_at_cancel jsonb;

COMMENT ON COLUMN public.user_profiles.welcome_ai_tokens_used IS
  'Groq tokens used during the 1-day welcome trial (cap 300,000). Reset is not needed when moving to paid trial (separate pool).';
COMMENT ON COLUMN public.user_profiles.paid_trial_ai_tokens_used IS
  'Groq tokens used during the 2-day Razorpay paid trial (cap 500,000). Cleared on first monthly charge.';
COMMENT ON COLUMN public.user_profiles.bonus_ai_tokens_ledger IS
  'JSON array of {amount, expires_at} bonus AI token pools (30-day expiry from purchase).';
COMMENT ON COLUMN public.user_profiles.bonus_ai_tokens IS
  'Denormalized sum of non-expired bonus AI token pools.';
COMMENT ON COLUMN public.user_profiles.subscription_cancelled_at IS
  'When the subscription was last set to cancelled (for 90-day extra-credit restore).';
COMMENT ON COLUMN public.user_profiles.bonus_voice_minutes_ledger_at_cancel IS
  'Snapshot of bonus_voice_minutes_ledger at cancellation for restore if user resubscribes within 90 days.';
COMMENT ON COLUMN public.user_profiles.bonus_ai_tokens_ledger_at_cancel IS
  'Snapshot of bonus_ai_tokens_ledger at cancellation for restore if user resubscribes within 90 days.';

-- Welcome trial voice: 5 minutes (300 seconds); update paid-trial messaging to 2-day.
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
  cap constant int := 300;
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
      'Your 1-day free trial has ended. Start the 2-day paid trial to keep going.'
    );
  END IF;

  IF COALESCE(prof.trial_voice_seconds_used, 0) + add_sec > cap THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'error',
      'You''ve used all welcome voice time for this trial (5 minutes).'
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
      'You''ve used all welcome voice time for this trial (5 minutes).'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'used', new_used, 'limit', cap);
END;
$$;

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
      'Your 1-day free trial has ended. Start the 2-day paid trial to keep going.'
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

COMMENT ON FUNCTION public.consume_welcome_trial_voice_seconds(uuid, int) IS
  'Atomic welcome-trial voice seconds increment (service_role only). Cap 300 seconds = 5 minutes.';
