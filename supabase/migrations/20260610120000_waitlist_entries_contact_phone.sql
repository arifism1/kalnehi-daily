-- Add contact_phone to waitlist_entries for WhatsApp/SMS notifications.
-- Also update assign_waitlist_position RPC to accept the new parameter.

ALTER TABLE public.waitlist_entries
  ADD COLUMN IF NOT EXISTS contact_phone text;

COMMENT ON COLUMN public.waitlist_entries.contact_phone IS
  'Mobile number provided at signup (for WhatsApp / SMS notifications). Stored as entered by the user.';

-- Update RPC to accept phone, store it alongside email.
CREATE OR REPLACE FUNCTION public.assign_waitlist_position(
  p_user_id            uuid,
  p_batch_id           uuid,
  p_notification_ch    text DEFAULT 'email',
  p_contact_email      text DEFAULT NULL,
  p_contact_phone      text DEFAULT NULL
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

  -- Serialize position assignment across concurrent callers.
  PERFORM pg_advisory_xact_lock(8473920631::bigint);

  SELECT COALESCE(MAX(position), 0) + 1 INTO v_position
  FROM public.waitlist_entries;

  INSERT INTO public.waitlist_entries (
    user_id, batch_id, position, status,
    notification_channel, contact_email, contact_phone
  ) VALUES (
    p_user_id, p_batch_id, v_position, 'waiting',
    p_notification_ch, p_contact_email, p_contact_phone
  );

  RETURN jsonb_build_object(
    'ok', true,
    'position', v_position,
    'batch_number', v_batch_num,
    'opens_at', v_opens_at
  );
END;
$$;

COMMENT ON FUNCTION public.assign_waitlist_position(uuid, uuid, text, text, text) IS
  'Atomically assigns the next global queue position to a user. Accepts optional phone for WhatsApp/SMS notifications.';

GRANT EXECUTE ON FUNCTION public.assign_waitlist_position(uuid, uuid, text, text, text)
  TO authenticated, service_role;
