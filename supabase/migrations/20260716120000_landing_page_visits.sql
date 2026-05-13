-- Anonymous landing traffic for admin dashboards (marketing route group).
-- Inserts via service role only (POST /api/public/landing-visit).

CREATE TABLE IF NOT EXISTS public.landing_page_visits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_session_id  text NOT NULL,
  path                text NOT NULL,
  referrer            text,
  utm                 jsonb NOT NULL DEFAULT '{}',
  visit_date_ist      date NOT NULL GENERATED ALWAYS AS (timezone('Asia/Kolkata', created_at)::date) STORED,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_page_visits_path_allowed CHECK (
    path IN ('/', '/kalnehi-daily', '/pricing')
  ),
  CONSTRAINT landing_page_visits_visitor_session_len CHECK (
    char_length(visitor_session_id) >= 8 AND char_length(visitor_session_id) <= 64
  )
);

COMMENT ON TABLE public.landing_page_visits IS
  'Anonymous first-party landing visits (allowlisted paths). One row per visitor_session_id+path+IST calendar day.';

CREATE UNIQUE INDEX IF NOT EXISTS landing_page_visits_session_path_day_ist_uq
  ON public.landing_page_visits (visitor_session_id, path, visit_date_ist);

CREATE INDEX IF NOT EXISTS landing_page_visits_created_at_idx
  ON public.landing_page_visits (created_at DESC);

CREATE INDEX IF NOT EXISTS landing_page_visits_path_created_idx
  ON public.landing_page_visits (path, created_at DESC);

ALTER TABLE public.landing_page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_page_visits_service_role_all"
  ON public.landing_page_visits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
