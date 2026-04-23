-- Daily free trial cap system.
-- Adds rolling per-day trial cap (default 2 000, IST midnight reset).
-- Cap is OFF by default — enable via admin /system page when ready.

-- ── 1. Extend app_config with cap settings ────────────────────────────────

ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS daily_trial_cap      integer NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS daily_cap_enabled    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_cap_timezone   text    NOT NULL DEFAULT 'Asia/Kolkata';

COMMENT ON COLUMN public.app_config.daily_trial_cap IS
  'Maximum free trial activations allowed per calendar day (IST). Default 2 000.';
COMMENT ON COLUMN public.app_config.daily_cap_enabled IS
  'When false the cap is completely bypassed — existing behaviour. Enable manually when ready.';
COMMENT ON COLUMN public.app_config.daily_cap_timezone IS
  'Timezone used to determine the calendar day boundary. Default Asia/Kolkata.';

-- Seed defaults (safe if columns already have them from ALTER DEFAULT).
UPDATE public.app_config
SET daily_trial_cap    = 2000,
    daily_cap_enabled  = false,
    daily_cap_timezone = 'Asia/Kolkata';


-- ── 2. daily_trial_counts — one row per IST calendar date ─────────────────

CREATE TABLE IF NOT EXISTS public.daily_trial_counts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date             date        NOT NULL,
  trials_started   integer     NOT NULL DEFAULT 0,
  cap              integer     NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_trial_counts_date_key UNIQUE (date)
);

COMMENT ON TABLE public.daily_trial_counts IS
  'One row per IST calendar date. Tracks how many free trials started today vs the configured cap.';
COMMENT ON COLUMN public.daily_trial_counts.cap IS
  'Snapshot of daily_trial_cap at the time this day row was first created.';

CREATE INDEX IF NOT EXISTS daily_trial_counts_date_idx
  ON public.daily_trial_counts (date DESC);

ALTER TABLE public.daily_trial_counts ENABLE ROW LEVEL SECURITY;

-- Service-role only — all reads/writes go through RPCs or server-side service-role client.
CREATE POLICY "service_role_daily_trial_counts"
  ON public.daily_trial_counts
  FOR ALL USING (false) WITH CHECK (false);


-- ── 3. Extend user_profiles ───────────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS trial_access_type text
    CHECK (trial_access_type IN ('daily_cap_free', 'skip_paid', 'direct', 'legacy')),
  ADD COLUMN IF NOT EXISTS trial_date date;

COMMENT ON COLUMN public.user_profiles.trial_access_type IS
  'How the user gained trial access: daily_cap_free (counted against daily cap), skip_paid (paid ₹19), direct (no cap), legacy (pre-cap system). Null for users who have not started a trial.';
COMMENT ON COLUMN public.user_profiles.trial_date IS
  'IST calendar date on which the trial was started (for daily count attribution).';

-- Backfill: all existing trial users are "legacy" — they predate the cap system.
UPDATE public.user_profiles
SET trial_access_type = 'legacy'
WHERE has_used_free_trial = true
  AND trial_access_type IS NULL;


-- ── 4. Atomic increment RPC ───────────────────────────────────────────────
--
-- Called by ensureFreeTrialStarted when daily_cap_enabled = true.
-- Uses an atomic upsert with a WHERE guard so two simultaneous requests
-- for the last spot result in exactly one success and one failure.

CREATE OR REPLACE FUNCTION public.increment_daily_trial_count(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap_val    integer;
  today_ist  date;
  row_trials integer;
  row_cap    integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_user');
  END IF;

  -- Resolve today's date in the configured timezone (default IST = UTC+5:30).
  SELECT (now() AT TIME ZONE COALESCE(daily_cap_timezone, 'Asia/Kolkata'))::date,
         daily_trial_cap
  INTO today_ist, cap_val
  FROM public.app_config
  LIMIT 1;

  IF cap_val IS NULL OR cap_val <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_cap');
  END IF;

  -- Atomic upsert.
  -- INSERT path (new day): always succeeds — first trial of the day.
  -- UPDATE path (existing day): only proceeds if trials_started < cap.
  -- The WHERE clause on DO UPDATE is evaluated against the *current* row,
  -- so two concurrent requests for the last spot result in one success and
  -- one no-op (RETURNING returns NULL for the blocked update).
  INSERT INTO public.daily_trial_counts (date, trials_started, cap)
  VALUES (today_ist, 1, cap_val)
  ON CONFLICT (date) DO UPDATE
    SET trials_started = daily_trial_counts.trials_started + 1,
        updated_at     = now()
    WHERE daily_trial_counts.trials_started < daily_trial_counts.cap
  RETURNING trials_started, cap INTO row_trials, row_cap;

  -- WHERE clause blocked the update — cap is full.
  IF row_trials IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'spots_remaining', 0);
  END IF;

  -- Mark the user profile with how they accessed their trial.
  UPDATE public.user_profiles
  SET trial_access_type = 'daily_cap_free',
      trial_date        = today_ist,
      updated_at        = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'ok',              true,
    'spots_remaining', GREATEST(0, row_cap - row_trials)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_daily_trial_count(uuid)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_daily_trial_count(uuid)
  FROM PUBLIC, anon, authenticated;
