-- Retention activation: syllabus marks milestone + exam score→rank bands.

ALTER TABLE public.user_journey_state
  ADD COLUMN IF NOT EXISTS first_syllabus_marks_raise_at timestamptz;

COMMENT ON COLUMN public.user_journey_state.first_syllabus_marks_raise_at IS
  'First time projected exam marks rose after marking syllabus progress.';

CREATE TABLE IF NOT EXISTS public.exam_score_rank_bands (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name   text        NOT NULL,
  score_min   numeric     NOT NULL,
  score_max   numeric     NOT NULL,
  rank_min    integer,
  rank_max    integer,
  percentile  numeric,
  label       text,
  sort_order  integer     NOT NULL DEFAULT 0,
  CONSTRAINT exam_score_rank_bands_score_range_chk CHECK (score_max >= score_min)
);

CREATE INDEX IF NOT EXISTS exam_score_rank_bands_exam_score_idx
  ON public.exam_score_rank_bands (exam_name, score_min DESC);

COMMENT ON TABLE public.exam_score_rank_bands IS
  'Approximate score→rank/percentile lookup for live projection UI (estimates only).';

ALTER TABLE public.exam_score_rank_bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_score_rank_bands_read_authenticated"
  ON public.exam_score_rank_bands FOR SELECT TO authenticated USING (true);

CREATE POLICY "exam_score_rank_bands_service_role_all"
  ON public.exam_score_rank_bands FOR ALL TO service_role USING (true) WITH CHECK (true);

-- NEET UG approximate AIR bands (illustrative; labeled estimate in UI).
INSERT INTO public.exam_score_rank_bands (exam_name, score_min, score_max, rank_min, rank_max, percentile, label, sort_order)
VALUES
  ('NEET UG', 700, 720, 1, 100, NULL, 'Top 100', 1),
  ('NEET UG', 680, 699, 101, 1000, NULL, 'Top 1k', 2),
  ('NEET UG', 650, 679, 1001, 5000, NULL, 'Top 5k', 3),
  ('NEET UG', 620, 649, 5001, 15000, NULL, 'Top 15k', 4),
  ('NEET UG', 590, 619, 15001, 40000, NULL, 'Top 40k', 5),
  ('NEET UG', 550, 589, 40001, 80000, NULL, 'Top 80k', 6),
  ('NEET UG', 500, 549, 80001, 150000, NULL, 'Top 1.5L', 7),
  ('NEET UG', 400, 499, 150001, 300000, NULL, 'Below 3L', 8),
  ('NEET UG', 0, 399, 300001, 999999, NULL, 'Qualifying zone', 9);

-- JEE Main percentile bands (out of 300).
INSERT INTO public.exam_score_rank_bands (exam_name, score_min, score_max, rank_min, rank_max, percentile, label, sort_order)
VALUES
  ('JEE Main', 285, 300, NULL, NULL, 99.9, '99.9+ percentile', 1),
  ('JEE Main', 270, 284, NULL, NULL, 99.5, '99.5+ percentile', 2),
  ('JEE Main', 250, 269, NULL, NULL, 99.0, '99+ percentile', 3),
  ('JEE Main', 230, 249, NULL, NULL, 97.0, '97+ percentile', 4),
  ('JEE Main', 210, 229, NULL, NULL, 95.0, '95+ percentile', 5),
  ('JEE Main', 190, 209, NULL, NULL, 90.0, '90+ percentile', 6),
  ('JEE Main', 170, 189, NULL, NULL, 85.0, '85+ percentile', 7),
  ('JEE Main', 150, 169, NULL, NULL, 75.0, '75+ percentile', 8),
  ('JEE Main', 120, 149, NULL, NULL, 60.0, '60+ percentile', 9),
  ('JEE Main', 0, 119, NULL, NULL, 40.0, 'Below 60 percentile', 10);
