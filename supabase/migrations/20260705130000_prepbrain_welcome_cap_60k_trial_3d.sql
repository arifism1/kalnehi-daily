-- Align PrepBrain welcome token cap with src/lib/prepbrainTokens.ts (WELCOME_AI_TOKEN_CAP = 60_000)
-- and welcome phase window with src/lib/freeTrial.ts (FREE_TRIAL_MS = 3 days).

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
  WELCOME_CAP constant int := 60000;
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
    AND now() < trial_s + interval '3 days'
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
  WELCOME_CAP constant int := 60000;
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
