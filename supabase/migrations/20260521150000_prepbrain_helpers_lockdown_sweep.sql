-- Lock down internal _prepbrain_* helpers: default EXECUTE for PUBLIC would expose them via PostgREST.
-- Sweep expired AI token reservations (refund estimate via same path as cancel).

-- ---------------------------------------------------------------------------
-- Cancel: allow phase_none (e.g. subscription lapsed after reserve) — still refund estimate to bonus.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prepbrain_ai_token_cancel_reservation(
  p_user_id uuid,
  p_reservation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.prepbrain_ai_token_reservations%ROWTYPE;
  prof public.user_profiles%ROWTYPE;
  bonus jsonb;
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

  IF r.finalized_at IS NOT NULL OR r.cancelled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'noop', true);
  END IF;

  SELECT * INTO prof FROM public.user_profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  bonus := COALESCE(prof.bonus_ai_tokens_ledger, '[]'::jsonb);

  refund_exp := now() + interval '30 days';
  bonus := public._prepbrain_add_bonus_ai_pool(bonus, r.estimate::bigint, refund_exp, now());
  bonus_sum := public._prepbrain_total_active_bonus_ai(bonus, now())::int;

  UPDATE public.user_profiles
  SET
    bonus_ai_tokens_ledger = bonus,
    bonus_ai_tokens = bonus_sum,
    ai_usage_row_version = COALESCE(ai_usage_row_version, 0) + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.prepbrain_ai_token_reservations
  SET cancelled_at = now()
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.prepbrain_ai_token_cancel_reservation(uuid, uuid) IS
  'Refunds reserved estimate to bonus pool when the model call is not completed (incl. sweep).';

-- ---------------------------------------------------------------------------
-- Sweep: cancel expired pending reservations (batch per run).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prepbrain_ai_token_sweep_expired()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  j jsonb;
  n int := 0;
  err int := 0;
BEGIN
  FOR r IN
    SELECT id, user_id
    FROM public.prepbrain_ai_token_reservations
    WHERE expires_at < now()
      AND finalized_at IS NULL
      AND cancelled_at IS NULL
    ORDER BY expires_at ASC
    LIMIT 500
  LOOP
    BEGIN
      j := public.prepbrain_ai_token_cancel_reservation(r.user_id, r.id);
      IF j->>'ok' = 'true' THEN
        n := n + 1;
      ELSE
        err := err + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      err := err + 1;
      RAISE WARNING 'prepbrain_ai_token_sweep_expired: cancel failed for % %: %', r.user_id, r.id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'cancelled', n, 'errors', err);
END;
$$;

REVOKE ALL ON FUNCTION public.prepbrain_ai_token_sweep_expired() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepbrain_ai_token_sweep_expired() TO service_role;

COMMENT ON FUNCTION public.prepbrain_ai_token_sweep_expired IS
  'Cron: refunds estimate for pending reservations past expires_at (batch 500).';

-- ---------------------------------------------------------------------------
-- Revoke helper EXECUTE from API roles (internal use by SECURITY DEFINER RPCs only).
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public._prepbrain_prune_bonus_ai_ledger(jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._prepbrain_total_active_bonus_ai(jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._prepbrain_consume_bonus_ai_fifo(jsonb, bigint, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._prepbrain_add_bonus_ai_pool(jsonb, bigint, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._prepbrain_apply_ai_token_consume(
  text, text, integer, integer, integer, text, jsonb, bigint, timestamptz
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._prepbrain_resolve_ai_phase(public.user_profiles) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._prepbrain_available_ai_tokens(
  text, text, integer, integer, integer, text, jsonb, timestamptz
) FROM PUBLIC, anon, authenticated;
