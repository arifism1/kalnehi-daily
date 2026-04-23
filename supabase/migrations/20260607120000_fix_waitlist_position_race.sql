-- Fix concurrent position assignment race in assign_waitlist_position.
-- The original RPC used SELECT MAX(position)+1 without a lock, so two concurrent
-- calls could both read the same MAX and produce duplicate position numbers.
-- Fix: acquire a transaction-scoped advisory lock (key = crc32 of the function name)
-- before reading MAX(position). All callers serialize on this lock, which is released
-- automatically at end of transaction.

CREATE OR REPLACE FUNCTION public.assign_waitlist_position(
  p_user_id            uuid,
  p_batch_id           uuid,
  p_notification_ch    text DEFAULT 'email',
  p_contact_email      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position   integer;
  v_batch_num  integer;
  v_opens_at   timestamptz;
  v_batch_size integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid user.');
  END IF;

  -- Prevent duplicate entries.
  IF EXISTS (SELECT 1 FROM public.waitlist_entries WHERE user_id = p_user_id) THEN
    SELECT we.position, b.batch_number, b.opens_at
    INTO v_position, v_batch_num, v_opens_at
    FROM public.waitlist_entries we
    JOIN public.batches b ON b.id = we.batch_id
    WHERE we.user_id = p_user_id;

    RETURN jsonb_build_object(
      'ok', true,
      'already_exists', true,
      'position', v_position,
      'batch_number', v_batch_num,
      'opens_at', v_opens_at
    );
  END IF;

  -- Get batch info and lock the batch row to prevent over-filling.
  SELECT batch_number, opens_at, size
  INTO v_batch_num, v_opens_at, v_batch_size
  FROM public.batches
  WHERE id = p_batch_id AND status = 'scheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Batch not available.');
  END IF;

  -- Acquire a transaction-scoped advisory lock to serialize the MAX(position)+1 read
  -- across all concurrent calls. Lock key is arbitrary but must be consistent.
  -- pg_advisory_xact_lock is released automatically at transaction end.
  PERFORM pg_advisory_xact_lock(8473920631::bigint);

  -- Next global position = max(position) + 1 across all entries, or 1.
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_position
  FROM public.waitlist_entries;

  INSERT INTO public.waitlist_entries (
    user_id, batch_id, position, status,
    notification_channel, contact_email
  ) VALUES (
    p_user_id, p_batch_id, v_position, 'waiting',
    p_notification_ch, p_contact_email
  );

  RETURN jsonb_build_object(
    'ok', true,
    'position', v_position,
    'batch_number', v_batch_num,
    'opens_at', v_opens_at
  );
END;
$$;

COMMENT ON FUNCTION public.assign_waitlist_position(uuid, uuid, text, text) IS
  'Atomically assigns the next global queue position to a user. Uses an advisory lock to prevent duplicate positions under concurrent load.';

GRANT EXECUTE ON FUNCTION public.assign_waitlist_position(uuid, uuid, text, text)
  TO authenticated, service_role;
