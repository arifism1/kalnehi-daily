-- Update join_trial_queue RPC:
--   • Smart date assignment: walks forward from tomorrow IST until it finds a
--     date where pending count < daily cap (so person 2001 gets tomorrow,
--     person 4001 gets day-after-tomorrow, etc.)
--   • Returns position (the user's slot number on their queued_for date),
--     newly_inserted (for email dedup — only true on first call per user),
--     and queued_for as before.

CREATE OR REPLACE FUNCTION public.join_trial_queue(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tz           text;
  daily_cap    int;
  candidate    date;
  pending_cnt  int;
  q_for        date;
  pos          int;
  was_inserted boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_user');
  END IF;

  -- Read cap config.
  SELECT
    COALESCE(daily_cap_timezone, 'Asia/Kolkata'),
    COALESCE(daily_trial_cap, 2000)
  INTO tz, daily_cap
  FROM public.app_config
  LIMIT 1;

  -- If user already has a pending row, return it (idempotent — do not change date).
  SELECT queued_for INTO q_for
  FROM public.trial_queue_entries
  WHERE user_id = p_user_id;

  IF q_for IS NOT NULL THEN
    -- Compute current position on their day.
    SELECT COUNT(*)::int INTO pos
    FROM public.trial_queue_entries
    WHERE queued_for = q_for
      AND status = 'pending'
      AND created_at <= (
        SELECT created_at FROM public.trial_queue_entries WHERE user_id = p_user_id
      );
    RETURN jsonb_build_object(
      'ok', true,
      'queued_for', q_for::text,
      'position', pos,
      'newly_inserted', false
    );
  END IF;

  -- Find the first future date (starting from tomorrow IST) with capacity.
  candidate := (now() AT TIME ZONE tz)::date + 1;

  LOOP
    SELECT COUNT(*)::int INTO pending_cnt
    FROM public.trial_queue_entries
    WHERE queued_for = candidate
      AND status = 'pending';

    EXIT WHEN pending_cnt < daily_cap;
    candidate := candidate + 1;
  END LOOP;

  -- Insert the new entry.
  INSERT INTO public.trial_queue_entries (user_id, queued_for)
  VALUES (p_user_id, candidate);

  was_inserted := true;

  -- Compute position (will be pending_cnt + 1 on this date).
  pos := pending_cnt + 1;

  RETURN jsonb_build_object(
    'ok', true,
    'queued_for', candidate::text,
    'position', pos,
    'newly_inserted', was_inserted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_trial_queue(uuid)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.join_trial_queue(uuid)
  FROM PUBLIC, anon, authenticated;
