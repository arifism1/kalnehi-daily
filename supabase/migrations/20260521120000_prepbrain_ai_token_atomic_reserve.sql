-- Atomic reserve / finalize / cancel for shared PrepBrain + HelpyJi AI token pools.
-- Debit a conservative estimate before the model; adjust after real usage (refund to bonus pool).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ai_usage_row_version bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_profiles.ai_usage_row_version IS
  'Incremented on each successful prepbrain_ai_token_* RPC (reserve/finalize/cancel).';

CREATE TABLE IF NOT EXISTS public.prepbrain_ai_token_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  estimate int NOT NULL CHECK (estimate > 0 AND estimate <= 500000),
  month_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  finalized_at timestamptz,
  cancelled_at timestamptz
);

CREATE INDEX IF NOT EXISTS prepbrain_ai_token_reservations_pending_idx
  ON public.prepbrain_ai_token_reservations (user_id)
  WHERE finalized_at IS NULL AND cancelled_at IS NULL;

-- Do not enable RLS here: with RLS on and zero policies, inserts from SECURITY DEFINER
-- RPCs fail when the function owner is not the table owner (typical on Supabase).
-- Rows are only written via service_role RPCs, not the Data API for anon/authenticated.
ALTER TABLE public.prepbrain_ai_token_reservations DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.prepbrain_ai_token_reservations FROM PUBLIC;
REVOKE ALL ON TABLE public.prepbrain_ai_token_reservations FROM anon, authenticated;

COMMENT ON TABLE public.prepbrain_ai_token_reservations IS
  'Outstanding AI token reserves (estimate debited); finalize or cancel refunds/adjusts.';

-- ---------------------------------------------------------------------------
-- Helpers (match src/lib/bonusCreditsLedger.ts + prepbrainTokenAccounting.ts)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._prepbrain_prune_bonus_ai_ledger(p_ledger jsonb, p_now timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  elem jsonb;
  out jsonb := '[]'::jsonb;
BEGIN
  IF p_ledger IS NULL OR jsonb_typeof(p_ledger) <> 'array' THEN
    RETURN '[]'::jsonb;
  END IF;
  FOR elem IN SELECT jsonb_array_elements(p_ledger)
  LOOP
    IF elem ? 'amount' AND elem ? 'expires_at' THEN
      BEGIN
        IF (elem->>'expires_at')::timestamptz > p_now AND COALESCE((elem->>'amount')::numeric, 0) > 0 THEN
          out := out || jsonb_build_array(elem);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
  RETURN COALESCE(out, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public._prepbrain_total_active_bonus_ai(p_ledger jsonb, p_now timestamptz)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE((
    SELECT SUM(GREATEST(0, floor((e->>'amount')::numeric))::bigint)
    FROM jsonb_array_elements(public._prepbrain_prune_bonus_ai_ledger(p_ledger, p_now)) AS e
  ), 0::bigint);
$$;

CREATE OR REPLACE FUNCTION public._prepbrain_consume_bonus_ai_fifo(
  p_ledger jsonb,
  p_need bigint,
  p_now timestamptz
)
RETURNS TABLE (ledger_out jsonb, taken bigint)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  sorted_elems jsonb[];
  elem jsonb;
  need bigint := GREATEST(0, p_need);
  rem bigint;
  take_amt bigint;
  start_need bigint := GREATEST(0, p_need);
  out_arr jsonb := '[]'::jsonb;
  pool_i int;
  pool_n int;
BEGIN
  IF need <= 0 THEN
    ledger_out := public._prepbrain_prune_bonus_ai_ledger(p_ledger, p_now);
    taken := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT array_agg(pool_row ORDER BY (pool_row->>'expires_at')::timestamptz ASC)
  INTO sorted_elems
  FROM jsonb_array_elements(public._prepbrain_prune_bonus_ai_ledger(p_ledger, p_now)) AS pool_row;

  IF sorted_elems IS NULL THEN
    ledger_out := '[]'::jsonb;
    taken := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  pool_n := array_length(sorted_elems, 1);
  IF pool_n IS NULL OR pool_n < 1 THEN
    ledger_out := '[]'::jsonb;
    taken := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Indexed loop: avoid FOREACH ... IN ARRAY <var> (parser treats name as relation in some PG builds).
  FOR pool_i IN 1..pool_n LOOP
    elem := sorted_elems[pool_i];
    IF elem IS NULL THEN CONTINUE; END IF;
    IF need <= 0 THEN
      out_arr := out_arr || jsonb_build_array(elem);
      CONTINUE;
    END IF;
    rem := GREATEST(0, floor((elem->>'amount')::numeric))::bigint;
    IF rem <= 0 THEN CONTINUE; END IF;
    take_amt := LEAST(rem, need);
    need := need - take_amt;
    rem := rem - take_amt;
    IF rem > 0 THEN
      out_arr := out_arr || jsonb_build_array(
        jsonb_build_object('amount', rem::int, 'expires_at', elem->>'expires_at')
      );
    END IF;
  END LOOP;

  taken := start_need - need;
  ledger_out := COALESCE(out_arr, '[]'::jsonb);
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public._prepbrain_add_bonus_ai_pool(
  p_ledger jsonb,
  p_amount bigint,
  p_expires_at timestamptz,
  p_now timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base jsonb;
BEGIN
  IF p_amount <= 0 THEN
    RETURN public._prepbrain_prune_bonus_ai_ledger(p_ledger, p_now);
  END IF;
  base := public._prepbrain_prune_bonus_ai_ledger(p_ledger, p_now);
  RETURN base || jsonb_build_array(
    jsonb_build_object(
      'amount', GREATEST(0, p_amount)::int,
      'expires_at', (p_expires_at AT TIME ZONE 'UTC')::text
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Apply positive delta to profile row (welcome / paid_trial / monthly); returns unapplied remainder.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._prepbrain_apply_ai_token_consume(
  p_phase text,
  p_month_key text,
  p_welcome int,
  p_paid_trial int,
  p_ai_used int,
  p_ai_month text,
  p_bonus jsonb,
  p_delta bigint,
  p_now timestamptz,
  OUT welcome_next int,
  OUT paid_next int,
  OUT ai_used_next int,
  OUT ai_month_next text,
  OUT bonus_next jsonb,
  OUT unapplied bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  d bigint := GREATEST(0, p_delta);
  remain bigint;
  room_base bigint;
  to_base bigint;
  wu int := GREATEST(0, p_welcome);
  pu int := GREATEST(0, p_paid_trial);
  base_used int;
  next_base int;
  cons record;
  WELCOME_CAP constant int := 300000;
  PAID_CAP constant int := 500000;
  MONTHLY_CAP constant int := 2000000;
BEGIN
  welcome_next := wu;
  paid_next := pu;
  ai_used_next := GREATEST(0, p_ai_used);
  ai_month_next := COALESCE(NULLIF(trim(p_ai_month), ''), '');
  bonus_next := COALESCE(p_bonus, '[]'::jsonb);
  unapplied := 0;

  IF d <= 0 THEN
    bonus_next := public._prepbrain_prune_bonus_ai_ledger(bonus_next, p_now);
    RETURN;
  END IF;

  remain := d;

  IF p_phase = 'welcome' THEN
    room_base := GREATEST(0, WELCOME_CAP - wu);
    to_base := LEAST(remain, room_base);
    welcome_next := wu + to_base::int;
    remain := remain - to_base;
    IF remain > 0 THEN
      SELECT * INTO cons FROM public._prepbrain_consume_bonus_ai_fifo(bonus_next, remain, p_now);
      bonus_next := cons.ledger_out;
      remain := remain - cons.taken;
    END IF;
    unapplied := remain;
    bonus_next := public._prepbrain_prune_bonus_ai_ledger(bonus_next, p_now);
    RETURN;
  END IF;

  IF p_phase = 'paid_trial' THEN
    room_base := GREATEST(0, PAID_CAP - pu);
    to_base := LEAST(remain, room_base);
    paid_next := pu + to_base::int;
    remain := remain - to_base;
    IF remain > 0 THEN
      SELECT * INTO cons FROM public._prepbrain_consume_bonus_ai_fifo(bonus_next, remain, p_now);
      bonus_next := cons.ledger_out;
      remain := remain - cons.taken;
    END IF;
    unapplied := remain;
    bonus_next := public._prepbrain_prune_bonus_ai_ledger(bonus_next, p_now);
    RETURN;
  END IF;

  IF p_phase = 'monthly' THEN
    IF trim(COALESCE(p_ai_month, '')) <> trim(p_month_key) THEN
      base_used := 0;
    ELSE
      base_used := GREATEST(0, p_ai_used);
    END IF;
    room_base := GREATEST(0, MONTHLY_CAP - base_used);
    to_base := LEAST(remain, room_base);
    next_base := base_used + to_base::int;
    ai_used_next := next_base;
    ai_month_next := trim(p_month_key);
    remain := remain - to_base;
    IF remain > 0 THEN
      SELECT * INTO cons FROM public._prepbrain_consume_bonus_ai_fifo(bonus_next, remain, p_now);
      bonus_next := cons.ledger_out;
      remain := remain - cons.taken;
    END IF;
    unapplied := remain;
    bonus_next := public._prepbrain_prune_bonus_ai_ledger(bonus_next, p_now);
    RETURN;
  END IF;

  unapplied := d;
END;
$$;

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
    AND now() < trial_s + interval '24 hours'
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

CREATE OR REPLACE FUNCTION public._prepbrain_available_ai_tokens(
  p_phase text,
  p_month_key text,
  p_welcome int,
  p_paid int,
  p_ai_used int,
  p_ai_month text,
  p_bonus jsonb,
  p_now timestamptz
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base_room bigint;
  bonus_sum bigint;
  WELCOME_CAP constant int := 300000;
  PAID_CAP constant int := 500000;
  MONTHLY_CAP constant int := 2000000;
  base_used int;
BEGIN
  bonus_sum := public._prepbrain_total_active_bonus_ai(p_bonus, p_now);
  IF p_phase = 'welcome' THEN
    base_room := GREATEST(0, WELCOME_CAP - GREATEST(0, p_welcome));
    RETURN base_room + bonus_sum;
  END IF;
  IF p_phase = 'paid_trial' THEN
    base_room := GREATEST(0, PAID_CAP - GREATEST(0, p_paid));
    RETURN base_room + bonus_sum;
  END IF;
  IF p_phase = 'monthly' THEN
    IF trim(COALESCE(p_ai_month, '')) <> trim(p_month_key) THEN
      base_used := 0;
    ELSE
      base_used := GREATEST(0, p_ai_used);
    END IF;
    base_room := GREATEST(0, MONTHLY_CAP - base_used);
    RETURN base_room + bonus_sum;
  END IF;
  RETURN 0;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reserve: lock profile, consume estimate, insert reservation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prepbrain_ai_token_reserve(
  p_user_id uuid,
  p_estimate int,
  p_month_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.user_profiles%ROWTYPE;
  phase text;
  avail bigint;
  wu int;
  pu int;
  au int;
  am text;
  bonus jsonb;
  u_applied bigint;
  bonus_sum int;
  res_id uuid;
  exp_at timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_user');
  END IF;
  IF p_estimate IS NULL OR p_estimate <= 0 OR p_estimate > 500000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_estimate');
  END IF;
  IF p_month_key IS NULL OR length(trim(p_month_key)) < 7 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_month_key');
  END IF;

  SELECT * INTO prof FROM public.user_profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  phase := public._prepbrain_resolve_ai_phase(prof);
  IF phase = 'none' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'phase_none');
  END IF;

  wu := COALESCE(prof.welcome_ai_tokens_used, 0);
  pu := COALESCE(prof.paid_trial_ai_tokens_used, 0);
  au := COALESCE(prof.ai_tokens_used, 0);
  am := COALESCE(prof.ai_tokens_month, '');
  bonus := COALESCE(prof.bonus_ai_tokens_ledger, '[]'::jsonb);

  avail := public._prepbrain_available_ai_tokens(
    phase, p_month_key, wu, pu, au, am, bonus, now()
  );

  IF avail < p_estimate THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_ai_tokens');
  END IF;

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
    p_month_key,
    wu,
    pu,
    au,
    am,
    bonus,
    p_estimate::bigint,
    now()
  );

  IF u_applied > 0 THEN
    RAISE EXCEPTION 'reserve_internal: could not apply full estimate (unapplied %)', u_applied;
  END IF;

  bonus_sum := public._prepbrain_total_active_bonus_ai(bonus, now())::int;

  UPDATE public.user_profiles
  SET
    welcome_ai_tokens_used = CASE WHEN phase = 'welcome' THEN wu ELSE welcome_ai_tokens_used END,
    paid_trial_ai_tokens_used = CASE WHEN phase = 'paid_trial' THEN pu ELSE paid_trial_ai_tokens_used END,
    ai_tokens_used = CASE WHEN phase = 'monthly' THEN au ELSE ai_tokens_used END,
    ai_tokens_month = CASE WHEN phase = 'monthly' THEN am ELSE ai_tokens_month END,
    bonus_ai_tokens_ledger = bonus,
    bonus_ai_tokens = bonus_sum,
    ai_usage_row_version = COALESCE(ai_usage_row_version, 0) + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  res_id := gen_random_uuid();
  exp_at := now() + interval '30 minutes';

  INSERT INTO public.prepbrain_ai_token_reservations (id, user_id, estimate, month_key, expires_at)
  VALUES (res_id, p_user_id, p_estimate, trim(p_month_key), exp_at);

  RETURN jsonb_build_object(
    'ok', true,
    'reservation_id', res_id,
    'version', (SELECT ai_usage_row_version FROM public.user_profiles WHERE user_id = p_user_id)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Finalize: extra debit or refund to bonus; mark reservation finalized
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prepbrain_ai_token_finalize(
  p_user_id uuid,
  p_reservation_id uuid,
  p_actual int
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
    -- expired: treat as cancel (refund estimate was not auto-done — caller should sweep)
    RETURN jsonb_build_object('ok', false, 'error', 'reservation_expired');
  END IF;

  est := r.estimate;
  -- Missing/zero usage from provider: bill full estimate (conservative for vendor).
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
      -- Log shortfall: could not debit full extra (should be rare after reserve headroom).
      RAISE WARNING 'prepbrain_ai_token_finalize: extra unapplied % for user %', u_applied, p_user_id;
    END IF;
  END IF;

  IF refund_amt > 0 THEN
    refund_exp := now() + interval '30 days';
    bonus := public._prepbrain_add_bonus_ai_pool(bonus, refund_amt, refund_exp, now());
  END IF;

  bonus_sum := public._prepbrain_total_active_bonus_ai(bonus, now())::int;

  UPDATE public.user_profiles
  SET
    welcome_ai_tokens_used = CASE WHEN phase = 'welcome' THEN wu ELSE welcome_ai_tokens_used END,
    paid_trial_ai_tokens_used = CASE WHEN phase = 'paid_trial' THEN pu ELSE paid_trial_ai_tokens_used END,
    ai_tokens_used = CASE WHEN phase = 'monthly' THEN au ELSE ai_tokens_used END,
    ai_tokens_month = CASE WHEN phase = 'monthly' THEN am ELSE ai_tokens_month END,
    bonus_ai_tokens_ledger = bonus,
    bonus_ai_tokens = bonus_sum,
    ai_usage_row_version = COALESCE(ai_usage_row_version, 0) + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.prepbrain_ai_token_reservations
  SET finalized_at = now()
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'ok', true,
    'version', (SELECT ai_usage_row_version FROM public.user_profiles WHERE user_id = p_user_id),
    'extra_applied', extra,
    'refunded', refund_amt
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Cancel: refund estimate to bonus pool (unused reservation)
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
  phase text;
  wu int;
  pu int;
  au int;
  am text;
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

  phase := public._prepbrain_resolve_ai_phase(prof);
  IF phase = 'none' THEN
    RAISE EXCEPTION 'phase_none during cancel';
  END IF;

  wu := COALESCE(prof.welcome_ai_tokens_used, 0);
  pu := COALESCE(prof.paid_trial_ai_tokens_used, 0);
  au := COALESCE(prof.ai_tokens_used, 0);
  am := COALESCE(prof.ai_tokens_month, '');
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

REVOKE ALL ON FUNCTION public.prepbrain_ai_token_reserve(uuid, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepbrain_ai_token_finalize(uuid, uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepbrain_ai_token_cancel_reservation(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.prepbrain_ai_token_reserve(uuid, int, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepbrain_ai_token_finalize(uuid, uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepbrain_ai_token_cancel_reservation(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.prepbrain_ai_token_reserve IS
  'Locks user_profiles, debits estimate from AI token pools, inserts reservation (PrepBrain/HelpyJi).';
COMMENT ON FUNCTION public.prepbrain_ai_token_finalize IS
  'Applies actual vs estimate: extra consumption or refund to bonus_ai_tokens_ledger.';
COMMENT ON FUNCTION public.prepbrain_ai_token_cancel_reservation IS
  'Refunds reserved estimate to bonus pool when the model call is not completed.';
