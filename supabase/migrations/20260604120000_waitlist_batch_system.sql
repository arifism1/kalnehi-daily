-- Waitlist & Batch System
-- Tables: batches, waitlist_entries, admin_config, admin_users
-- Also extends razorpay_processed_payments to allow 'waitlist_skip' kind.

-- ── 1. batches ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.batches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number   integer UNIQUE NOT NULL,
  opens_at       timestamptz NOT NULL,
  closes_at      timestamptz,
  status         text NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'active', 'analyzing', 'complete')),
  size           integer NOT NULL DEFAULT 10000,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.batches IS
  'One row per release batch. opens_at marks when the batch trial window starts.';
COMMENT ON COLUMN public.batches.batch_number IS
  'Monotonically increasing batch identifier shown to users (Batch 1, Batch 2, …).';
COMMENT ON COLUMN public.batches.size IS
  'Maximum number of waitlist positions in this batch (configurable; default 10 000).';

CREATE INDEX IF NOT EXISTS batches_status_opens_at_idx
  ON public.batches (status, opens_at);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Only service-role can read/write batches (admin only).
CREATE POLICY "service_role_batches" ON public.batches
  FOR ALL USING (false) WITH CHECK (false);


-- ── 2. waitlist_entries ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL,
  batch_id              uuid REFERENCES public.batches (id) ON DELETE SET NULL,
  position              integer NOT NULL,
  status                text NOT NULL DEFAULT 'waiting'
                          CHECK (status IN ('waiting', 'activated', 'skipped', 'expired_no_convert')),
  skipped_waitlist      boolean NOT NULL DEFAULT false,
  razorpay_payment_id   text UNIQUE,
  notification_channel  text NOT NULL DEFAULT 'email'
                          CHECK (notification_channel IN ('email', 'push', 'both')),
  -- denormalised email for notification (user may not have a Supabase auth email in some flows)
  contact_email         text,
  joined_at             timestamptz NOT NULL DEFAULT now(),
  activated_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT waitlist_entries_user_unique UNIQUE (user_id)
);

COMMENT ON TABLE public.waitlist_entries IS
  'One row per user in the waitlist. position is global and locked on insert — never changes.';
COMMENT ON COLUMN public.waitlist_entries.position IS
  'Global queue position (1-based). Assigned once on insert via assignWaitlistPosition RPC, never updated.';
COMMENT ON COLUMN public.waitlist_entries.status IS
  'waiting = in queue. activated = trial started via batch open. skipped = paid ₹19 to skip. expired_no_convert = trial ended without subscribing.';
COMMENT ON COLUMN public.waitlist_entries.skipped_waitlist IS
  'True when user paid ₹19 to skip; redundant but convenient for filtering.';
COMMENT ON COLUMN public.waitlist_entries.razorpay_payment_id IS
  'Razorpay payment_id for the ₹19 skip order. Used for idempotency.';

CREATE INDEX IF NOT EXISTS waitlist_entries_user_id_idx
  ON public.waitlist_entries (user_id);
CREATE INDEX IF NOT EXISTS waitlist_entries_batch_id_status_idx
  ON public.waitlist_entries (batch_id, status);
CREATE INDEX IF NOT EXISTS waitlist_entries_position_idx
  ON public.waitlist_entries (position);

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Users can read their own row (unauthenticated reads via signed token handled server-side).
CREATE POLICY "users_read_own_waitlist_entry" ON public.waitlist_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own row (join flow goes through server action but this covers direct RPC).
CREATE POLICY "users_insert_own_waitlist_entry" ON public.waitlist_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service-role handles all writes.


-- ── 3. admin_config ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_config (
  key            text PRIMARY KEY,
  value          text NOT NULL,
  previous_value text,
  updated_by     uuid,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_config IS
  'Editable runtime configuration for the batch/waitlist system. All changes are auditable via updated_by + updated_at.';

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Only service-role (admin) can access.
CREATE POLICY "service_role_admin_config" ON public.admin_config
  FOR ALL USING (false) WITH CHECK (false);

-- Seed default config values.
INSERT INTO public.admin_config (key, value) VALUES
  ('batch_size',                        '10000'),
  ('batch_cycle_days',                  '5'),
  ('trial_duration_days',               '3'),
  ('free_token_allocation',             '60000'),
  ('free_voice_seconds',                '720'),
  ('smart_trial_price_inr',             '19'),
  ('smart_plan_monthly_price_inr',      '499'),
  ('smart_plan_annual_price_inr',       '4790'),
  ('smart_plan_tokens_monthly',         '2000000'),
  ('smart_plan_voice_minutes_monthly',  '6000'),
  ('retargeting_d7_enabled',            'true'),
  ('retargeting_d14_enabled',           'true'),
  ('skip_cta_show_threshold_days',      '5'),
  ('skip_cta_primary_threshold_days',   '30'),
  ('max_waitlist_skip_per_user',        '1')
ON CONFLICT (key) DO NOTHING;


-- ── 4. admin_users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id    uuid PRIMARY KEY,
  added_by   uuid,
  added_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_users IS
  'Users who can access the /admin dashboard. user_id matches auth.users.id.';

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_admin_users" ON public.admin_users
  FOR ALL USING (false) WITH CHECK (false);


-- ── 5. Extend razorpay_processed_payments to allow waitlist_skip kind ─
ALTER TABLE public.razorpay_processed_payments
  DROP CONSTRAINT IF EXISTS razorpay_processed_payments_kind_check;

ALTER TABLE public.razorpay_processed_payments
  ADD CONSTRAINT razorpay_processed_payments_kind_check
    CHECK (kind IN ('extra_credits', 'plan_upgrade', 'waitlist_skip', 'annual_plan'))
    NOT VALID;


-- ── 6. Add payment_grace_until to user_profiles (edge case 6) ─────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS payment_grace_until timestamptz;

COMMENT ON COLUMN public.user_profiles.payment_grace_until IS
  'If set, Smart Plan remains active until this timestamp even if autopay renewal fails. Used for the 3-day grace period on payment failure.';


-- ── 7. assign_waitlist_position RPC ──────────────────────────────────
-- Atomically inserts a new waitlist_entries row with the next available position.
-- Returns: {ok, position, batch_id, batch_number, opens_at}
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
-- Called after ₹19 payment verified. Marks entry as skipped and starts trial.
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
