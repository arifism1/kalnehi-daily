-- Trial queue: users who hit the daily free-trial cap get queued for the
-- next available day. Cron job activates them at midnight IST.

-- ── 1. trial_queue_entries ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.trial_queue_entries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  queued_for    date        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'activated', 'skipped')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  activated_at  timestamptz,
  notified_at   timestamptz
);

COMMENT ON TABLE public.trial_queue_entries IS
  'One row per user. Populated when a user tries to start a free trial but the daily cap is full. The cron job at midnight IST activates pending entries in FIFO order up to that day''s cap.';

COMMENT ON COLUMN public.trial_queue_entries.queued_for IS
  'IST date on which the user is scheduled to receive a free trial slot.';
COMMENT ON COLUMN public.trial_queue_entries.status IS
  'pending = waiting for activation, activated = trial was started by cron, skipped = user paid ₹19 or already started trial another way.';

-- Index for the cron query (queued_for + status) and for admin lookups.
CREATE INDEX IF NOT EXISTS trial_queue_entries_date_status_idx
  ON public.trial_queue_entries (queued_for, status);

ALTER TABLE public.trial_queue_entries ENABLE ROW LEVEL SECURITY;

-- Service-role only — all reads/writes go through RPCs or server-side service-role client.
CREATE POLICY "service_role_trial_queue_entries"
  ON public.trial_queue_entries
  FOR ALL USING (false) WITH CHECK (false);


-- ── 2. join_trial_queue RPC ───────────────────────────────────────────────
--
-- Idempotent upsert: safe to call multiple times for the same user.
-- - First call: inserts a pending row for queued_for = tomorrow IST.
-- - Subsequent calls: returns existing queued_for without modification.
--   (Prevents a double-click from bumping the date forward.)

CREATE OR REPLACE FUNCTION public.join_trial_queue(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tomorrow_ist date;
  q_for        date;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_user');
  END IF;

  -- Tomorrow in the configured timezone (default Asia/Kolkata = IST).
  SELECT ((now() AT TIME ZONE COALESCE(daily_cap_timezone, 'Asia/Kolkata'))::date + 1)
  INTO tomorrow_ist
  FROM public.app_config
  LIMIT 1;

  -- Insert if no row exists yet; do nothing on conflict so we don't alter
  -- an already-pending entry's queued_for date.
  INSERT INTO public.trial_queue_entries (user_id, queued_for)
  VALUES (p_user_id, tomorrow_ist)
  ON CONFLICT (user_id) DO NOTHING;

  -- Return whichever queued_for the row ended up with.
  SELECT queued_for INTO q_for
  FROM public.trial_queue_entries
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'queued_for', q_for::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_trial_queue(uuid)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.join_trial_queue(uuid)
  FROM PUBLIC, anon, authenticated;
