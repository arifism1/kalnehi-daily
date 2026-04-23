-- Finish waitlist/batch migration when 20260604120000 stopped after DROP CONSTRAINT
-- (ADD CONSTRAINT without NOT VALID fails on legacy kind values). Safe to run on any
-- environment: idempotent constraint replace, IF NOT EXISTS column, OR REPLACE RPCs.

-- ── 5. Extend razorpay_processed_payments (NOT VALID = no full-table scan) ─
ALTER TABLE public.razorpay_processed_payments
  DROP CONSTRAINT IF EXISTS razorpay_processed_payments_kind_check;

ALTER TABLE public.razorpay_processed_payments
  ADD CONSTRAINT razorpay_processed_payments_kind_check
    CHECK (kind IN ('extra_credits', 'plan_upgrade', 'waitlist_skip', 'annual_plan'))
    NOT VALID;


-- ── 6. payment_grace_until on user_profiles ───────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS payment_grace_until timestamptz;

COMMENT ON COLUMN public.user_profiles.payment_grace_until IS
  'If set, Smart Plan remains active until this timestamp even if autopay renewal fails. Used for the 3-day grace period on payment failure.';


-- ── 7. assign_waitlist_position RPC ──────────────────────────────────
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

  -- Get batch info.
  SELECT batch_number, opens_at, size
  INTO v_batch_num, v_opens_at, v_batch_size
  FROM public.batches
  WHERE id = p_batch_id AND status = 'scheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Batch not available.');
  END IF;

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
  'Atomically assigns the next global queue position to a user. Returns position and batch metadata.';

GRANT EXECUTE ON FUNCTION public.assign_waitlist_position(uuid, uuid, text, text)
  TO authenticated, service_role;


-- ── 8. activate_waitlist_skip RPC ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activate_waitlist_skip(
  p_user_id           uuid,
  p_razorpay_payment_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.waitlist_entries%ROWTYPE;
  v_prof  public.user_profiles%ROWTYPE;
  v_has_waitlist_entry boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid user.');
  END IF;

  -- Idempotency: check payment already processed.
  IF EXISTS (
    SELECT 1 FROM public.razorpay_processed_payments
    WHERE razorpay_payment_id = p_razorpay_payment_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true);
  END IF;

  SELECT * INTO v_prof FROM public.user_profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User profile not found.');
  END IF;

  -- Prevent re-use if user has already had a trial.
  IF COALESCE(v_prof.has_had_trial, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_had_trial');
  END IF;

  -- Get or upsert waitlist entry.
  SELECT * INTO v_entry FROM public.waitlist_entries WHERE user_id = p_user_id FOR UPDATE;
  v_has_waitlist_entry := FOUND;

  -- Record idempotency.
  INSERT INTO public.razorpay_processed_payments (razorpay_payment_id, user_id, kind)
  VALUES (p_razorpay_payment_id, p_user_id, 'waitlist_skip');

  IF v_has_waitlist_entry THEN
    -- Update existing entry.
    UPDATE public.waitlist_entries
    SET status               = 'skipped',
        skipped_waitlist     = true,
        razorpay_payment_id  = p_razorpay_payment_id,
        activated_at         = now()
    WHERE user_id = p_user_id;
  ELSE
    -- User skipped without ever joining the waitlist form (direct payment link).
    -- Assign a synthetic position at the current max + 1.
    DECLARE
      v_pos integer;
    BEGIN
      SELECT COALESCE(MAX(position), 0) + 1 INTO v_pos FROM public.waitlist_entries;
      INSERT INTO public.waitlist_entries (
        user_id, position, status, skipped_waitlist,
        razorpay_payment_id, notification_channel, activated_at
      ) VALUES (
        p_user_id, v_pos, 'skipped', true,
        p_razorpay_payment_id, 'email', now()
      );
    END;
  END IF;

  -- Start the free trial on user_profiles.
  UPDATE public.user_profiles
  SET trial_started_at    = now(),
      has_used_free_trial = true,
      updated_at          = now()
  WHERE user_id = p_user_id
    AND NOT COALESCE(has_used_free_trial, false);

  RETURN jsonb_build_object('ok', true, 'trial_started_at', now());
END;
$$;

COMMENT ON FUNCTION public.activate_waitlist_skip(uuid, text) IS
  'After ₹19 payment: marks waitlist entry as skipped and starts the 3-day free trial. Idempotent.';

GRANT EXECUTE ON FUNCTION public.activate_waitlist_skip(uuid, text) TO service_role;
