-- Add per-call split token columns to prepbrain_ai_token_reservations.
-- Extend prepbrain_ai_token_finalize to record provider-reported input/output splits.
-- Fully backward-compatible: existing callers omitting the new params still work.

-- ── 1. New columns ─────────────────────────────────────────────────────────────

ALTER TABLE public.prepbrain_ai_token_reservations
  ADD COLUMN IF NOT EXISTS input_tokens  int     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS output_tokens int     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider      text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS model         text    DEFAULT NULL;

-- ── 2. Drop old finalize function (signature change requires drop+recreate) ────

DROP FUNCTION IF EXISTS public.prepbrain_ai_token_finalize(uuid, uuid, int);

-- ── 3. Recreate with optional split params ─────────────────────────────────────

CREATE FUNCTION public.prepbrain_ai_token_finalize(
  p_user_id        uuid,
  p_reservation_id uuid,
  p_actual         int,
  p_input_tokens   int  DEFAULT NULL,
  p_output_tokens  int  DEFAULT NULL,
  p_provider       text DEFAULT NULL,
  p_model          text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.prepbrain_ai_token_reservations%ROWTYPE;
  prof public.user_profiles%ROWTYPE;
  phase text;
  est int;
  actual_safe bigint;
  extra bigint;
  refund_amt bigint;
  wu int;
  pu int;
  au int;
  am text;
  bonus jsonb;
  u_applied bigint;
  bonus_sum int;
  refund_exp timestamptz;
BEGIN
  IF p_user_id IS NULL OR p_reservation_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_args');
  END IF;

  SELECT * INTO r
  FROM public.prepbrain_ai_token_reservations
  WHERE id = p_reservation_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reservation_not_found');
  END IF;

  IF r.cancelled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_cancelled');
  END IF;

  IF r.finalized_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  IF r.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reservation_expired');
  END IF;

  est := r.estimate;
  IF p_actual IS NULL OR p_actual <= 0 THEN
    actual_safe := est;
  ELSE
    actual_safe := LEAST(p_actual::bigint, 5000000);
  END IF;

  extra := GREATEST(0, actual_safe - est);
  refund_amt := GREATEST(0, est - actual_safe);

  SELECT * INTO prof FROM public.user_profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile missing during finalize';
  END IF;

  phase := public._prepbrain_resolve_ai_phase(prof);
  IF phase = 'none' THEN
    RAISE EXCEPTION 'phase_none during finalize';
  END IF;

  wu := COALESCE(prof.welcome_ai_tokens_used, 0);
  pu := COALESCE(prof.paid_trial_ai_tokens_used, 0);
  au := COALESCE(prof.ai_tokens_used, 0);
  am := COALESCE(prof.ai_tokens_month, '');
  bonus := COALESCE(prof.bonus_ai_tokens_ledger, '[]'::jsonb);

  IF extra > 0 THEN
    SELECT
      welcome_next,
      paid_next,
      ai_used_next,
      ai_month_next,
      bonus_next,
      unapplied
    INTO wu, pu, au, am, bonus, u_applied
    FROM public._prepbrain_apply_ai_token_consume(
      phase,
      r.month_key,
      wu,
      pu,
      au,
      am,
      bonus,
      extra,
      now()
    );

    IF u_applied > 0 THEN
      RAISE WARNING 'prepbrain_ai_token_finalize: extra unapplied % for user %', u_applied, p_user_id;
    END IF;
  END IF;

  IF refund_amt > 0 THEN
    refund_exp := now() + interval '30 days';
    bonus_sum := 0;
    FOR i IN 0..jsonb_array_length(bonus) - 1 LOOP
      bonus_sum := bonus_sum + COALESCE((bonus->i->>'amount')::int, 0);
    END LOOP;

    IF bonus_sum < 5000000 THEN
      bonus := bonus || jsonb_build_array(
        jsonb_build_object(
          'amount', refund_amt::int,
          'expires_at', refund_exp::text,
          'source', 'finalize_refund'
        )
      );
    END IF;
  END IF;

  UPDATE public.user_profiles
  SET
    welcome_ai_tokens_used   = wu,
    paid_trial_ai_tokens_used = pu,
    ai_tokens_used           = au,
    ai_tokens_month          = am,
    bonus_ai_tokens_ledger   = bonus
  WHERE user_id = p_user_id;

  -- Record finalize timestamp and token split details
  UPDATE public.prepbrain_ai_token_reservations
  SET
    finalized_at  = now(),
    input_tokens  = p_input_tokens,
    output_tokens = p_output_tokens,
    provider      = p_provider,
    model         = p_model
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── 4. Restore grants ──────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.prepbrain_ai_token_finalize(uuid, uuid, int, int, int, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepbrain_ai_token_finalize(uuid, uuid, int, int, int, text, text) TO service_role;

COMMENT ON FUNCTION public.prepbrain_ai_token_finalize IS
  'Applies actual vs estimate: extra consumption or refund to bonus_ai_tokens_ledger. Optionally records input/output token split, provider and model for cost analytics.';
