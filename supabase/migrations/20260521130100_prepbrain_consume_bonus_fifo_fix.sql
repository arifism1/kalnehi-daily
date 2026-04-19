-- Repair: replace bonus FIFO helper if an older 20260521120000 revision used
-- FOREACH ... IN ARRAY (parsed as relation name on some Postgres / Supabase SQL runners).
--
-- Also turn off RLS on the reservations table if it was enabled without policies (breaks RPC inserts).

ALTER TABLE IF EXISTS public.prepbrain_ai_token_reservations DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.prepbrain_ai_token_reservations FROM PUBLIC;
REVOKE ALL ON TABLE public.prepbrain_ai_token_reservations FROM anon, authenticated;

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

COMMENT ON FUNCTION public._prepbrain_consume_bonus_ai_fifo(jsonb, bigint, timestamptz) IS
  'FIFO consume from bonus_ai_tokens_ledger (indexed loop; no FOREACH IN ARRAY).';
