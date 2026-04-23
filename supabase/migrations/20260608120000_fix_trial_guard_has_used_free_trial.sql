-- Fix: activate_waitlist_skip only checked has_had_trial, which is never set for
-- new users (only backfilled by migration for pre-existing paid accounts).
-- The reliable flag for post-launch users is has_used_free_trial, set by all
-- trial-start code paths. This migration:
--   1. Updates the RPC to block on has_had_trial OR has_used_free_trial.
--   2. Sets has_had_trial = true at the end so it stays in sync from this point on.
--   3. Backfills has_had_trial for any user where has_used_free_trial is already true.

-- ── Backfill ─────────────────────────────────────────────────────────────────
UPDATE public.user_profiles
SET has_had_trial = true
WHERE has_used_free_trial = true
  AND NOT COALESCE(has_had_trial, false);

-- ── Updated RPC ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activate_waitlist_skip(
  p_user_id             uuid,
  p_razorpay_payment_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry              public.waitlist_entries%ROWTYPE;
  v_prof               public.user_profiles%ROWTYPE;
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

  -- Block if user has ever had a trial via either flag:
  -- has_had_trial  = backfilled from legacy paid accounts
  -- has_used_free_trial = set by every post-launch trial-start code path
  IF COALESCE(v_prof.has_had_trial, false) OR COALESCE(v_prof.has_used_free_trial, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_had_trial');
  END IF;

  -- Get or upsert waitlist entry.
  SELECT * INTO v_entry FROM public.waitlist_entries WHERE user_id = p_user_id FOR UPDATE;
  v_has_waitlist_entry := FOUND;

  -- Record idempotency.
  INSERT INTO public.razorpay_processed_payments (razorpay_payment_id, user_id, kind)
  VALUES (p_razorpay_payment_id, p_user_id, 'waitlist_skip');

  IF v_has_waitlist_entry THEN
    UPDATE public.waitlist_entries
    SET status               = 'skipped',
        skipped_waitlist     = true,
        razorpay_payment_id  = p_razorpay_payment_id,
        activated_at         = now()
    WHERE user_id = p_user_id;
  ELSE
    -- User skipped without ever joining the waitlist form (direct payment link).
    DECLARE
      v_pos integer;
    BEGIN
      PERFORM pg_advisory_xact_lock(8473920631::bigint);
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

  -- Start the free trial and set both flags so future checks are reliable.
  UPDATE public.user_profiles
  SET trial_started_at    = now(),
      has_used_free_trial = true,
      has_had_trial       = true,
      updated_at          = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'trial_started_at', now());
END;
$$;

COMMENT ON FUNCTION public.activate_waitlist_skip(uuid, text) IS
  'After ₹19 payment: marks waitlist entry as skipped and starts the 3-day free trial. Idempotent. Blocks users who have already had any trial (checks both has_had_trial and has_used_free_trial).';

GRANT EXECUTE ON FUNCTION public.activate_waitlist_skip(uuid, text) TO service_role;
