-- Per-user foreground active time rollup by IST calendar day.
-- Upserts from authenticated POST /api/activity/active-time (service role).

CREATE TABLE IF NOT EXISTS public.user_app_active_time_daily (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_ist       date NOT NULL,
  active_seconds integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_app_active_time_daily_pk PRIMARY KEY (user_id, date_ist),
  CONSTRAINT user_app_active_time_daily_seconds_nonneg CHECK (active_seconds >= 0),
  CONSTRAINT user_app_active_time_daily_daily_cap CHECK (active_seconds <= 86400)
);

COMMENT ON TABLE public.user_app_active_time_daily IS
  'Foreground seconds while tab visible in the authenticated app shell; summed per user per IST date.';

CREATE INDEX IF NOT EXISTS user_app_active_time_daily_date_ist_idx
  ON public.user_app_active_time_daily (date_ist DESC);

ALTER TABLE public.user_app_active_time_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_app_active_time_daily_service_role_all"
  ON public.user_app_active_time_daily
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Atomic additive increment (called only from service-role server routes).
CREATE OR REPLACE FUNCTION public.increment_user_app_active_seconds(
  p_user_id uuid,
  p_date_ist date,
  p_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_date_ist IS NULL THEN
    RETURN;
  END IF;
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RETURN;
  END IF;
  IF p_delta > 120 THEN
    RAISE EXCEPTION 'increment_user_app_active_seconds: delta too large';
  END IF;

  INSERT INTO public.user_app_active_time_daily (user_id, date_ist, active_seconds, updated_at)
  VALUES (p_user_id, p_date_ist, LEAST(p_delta, 86400), now())
  ON CONFLICT (user_id, date_ist)
  DO UPDATE SET
    active_seconds = LEAST(
      86400,
      public.user_app_active_time_daily.active_seconds + EXCLUDED.active_seconds
    ),
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.increment_user_app_active_seconds IS
  'Adds foreground-active seconds for one IST calendar day (cap 86400s/day). Max +120 per call.';

REVOKE ALL ON FUNCTION public.increment_user_app_active_seconds(uuid, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_app_active_seconds(uuid, date, integer) TO service_role;
