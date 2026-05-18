-- Aspirant journey analytics: per-user milestone state + computed rollups for admin.

CREATE TYPE public.journey_segment AS ENUM (
  'explorer',
  'activated',
  'engaged',
  'power',
  'at_risk',
  'churned'
);

CREATE TABLE IF NOT EXISTS public.user_journey_state (
  user_id                    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  first_app_open_at          timestamptz,
  onboarding_started_at      timestamptz,
  onboarding_completed_at    timestamptz,
  first_ai_insight_at        timestamptz,
  first_study_session_at     timestamptz,
  first_task_at              timestamptz,
  first_chapter_marked_at    timestamptz,
  first_revision_at          timestamptz,
  first_mock_logged_at       timestamptz,
  first_value_at             timestamptz,
  current_score_entered_at   timestamptz,
  target_score_entered_at    timestamptz,
  onboarding_steps           jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_journey_state IS
  'Idempotent first-occurrence timestamps for product journey milestones.';

CREATE TABLE IF NOT EXISTS public.user_journey_metrics (
  user_id                      uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  signup_at                    timestamptz,
  last_active_at               timestamptz,
  total_sessions               integer NOT NULL DEFAULT 0,
  current_streak               integer NOT NULL DEFAULT 0,
  longest_streak               integer NOT NULL DEFAULT 0,
  returned_day_1               boolean NOT NULL DEFAULT false,
  returned_day_7               boolean NOT NULL DEFAULT false,
  activated_at                 timestamptz,
  segment                      public.journey_segment NOT NULL DEFAULT 'explorer',
  time_to_first_value_seconds  integer,
  avg_session_seconds_7d       integer,
  active_days_last_7d          integer NOT NULL DEFAULT 0,
  distinct_features_last_7d    integer NOT NULL DEFAULT 0,
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_journey_metrics IS
  'Computed journey rollups for admin dashboards; refreshed by cron and on app_opened.';

CREATE INDEX IF NOT EXISTS user_journey_metrics_segment_idx
  ON public.user_journey_metrics (segment);

CREATE INDEX IF NOT EXISTS user_journey_metrics_last_active_idx
  ON public.user_journey_metrics (last_active_at DESC);

CREATE INDEX IF NOT EXISTS user_journey_metrics_signup_idx
  ON public.user_journey_metrics (signup_at DESC);

ALTER TABLE public.user_journey_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_journey_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_user_journey_state"
  ON public.user_journey_state FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "deny_all_user_journey_metrics"
  ON public.user_journey_metrics FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "user_journey_state_service_role_all"
  ON public.user_journey_state FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "user_journey_metrics_service_role_all"
  ON public.user_journey_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Backfill milestones from existing domain data ─────────────────────────────

INSERT INTO public.user_journey_state (user_id, onboarding_completed_at, first_value_at, updated_at)
SELECT
  p.user_id,
  p.mandatory_onboarding_completed_at,
  p.mandatory_onboarding_completed_at,
  now()
FROM public.user_profiles p
WHERE p.user_id IS NOT NULL
  AND p.mandatory_onboarding_completed_at IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  onboarding_completed_at = COALESCE(
    public.user_journey_state.onboarding_completed_at,
    EXCLUDED.onboarding_completed_at
  ),
  first_value_at = COALESCE(public.user_journey_state.first_value_at, EXCLUDED.first_value_at),
  updated_at = now();

UPDATE public.user_journey_state s SET first_ai_insight_at = sub.ts
FROM (
  SELECT c.user_id, MIN(m.created_at) AS ts
  FROM public.prepbrain_conversations c
  JOIN public.prepbrain_messages m ON m.conversation_id = c.id
  WHERE m.message_role = 'user'
  GROUP BY c.user_id
) sub
WHERE s.user_id = sub.user_id AND s.first_ai_insight_at IS NULL;

UPDATE public.user_journey_state s SET first_study_session_at = sub.ts
FROM (
  SELECT user_id, MIN(started_at) AS ts
  FROM public.study_sessions
  GROUP BY user_id
) sub
WHERE s.user_id = sub.user_id AND s.first_study_session_at IS NULL;

UPDATE public.user_journey_state s SET first_task_at = sub.ts
FROM (
  SELECT dp.user_id, MIN(dt.created_at) AS ts
  FROM public.daily_tasks dt
  JOIN public.daily_plans dp ON dp.id = dt.daily_plan_id
  GROUP BY dp.user_id
) sub
WHERE s.user_id = sub.user_id AND s.first_task_at IS NULL;

UPDATE public.user_journey_state s SET first_chapter_marked_at = sub.ts
FROM (
  SELECT user_id, MIN(last_updated) AS ts
  FROM public.user_microtopic_progress
  WHERE status = 'completed'
  GROUP BY user_id
) sub
WHERE s.user_id = sub.user_id AND s.first_chapter_marked_at IS NULL;

UPDATE public.user_journey_state s SET first_revision_at = sub.ts
FROM (
  SELECT user_id, MIN(created_at) AS ts
  FROM public.user_revision_logs
  GROUP BY user_id
) sub
WHERE s.user_id = sub.user_id AND s.first_revision_at IS NULL;

UPDATE public.user_journey_state s SET first_mock_logged_at = sub.ts
FROM (
  SELECT user_id, MIN(created_at) AS ts
  FROM public.mock_tests
  GROUP BY user_id
) sub
WHERE s.user_id = sub.user_id AND s.first_mock_logged_at IS NULL;

-- first_value_at: earliest value action among AI, study, task
UPDATE public.user_journey_state s SET
  first_value_at = sub.earliest,
  updated_at = now()
FROM (
  SELECT
    user_id,
    (
      SELECT MIN(v)
      FROM unnest(
        ARRAY[
          first_ai_insight_at,
          first_study_session_at,
          first_task_at
        ]::timestamptz[]
      ) AS v
    ) AS earliest
  FROM public.user_journey_state
  WHERE first_ai_insight_at IS NOT NULL
     OR first_study_session_at IS NOT NULL
     OR first_task_at IS NOT NULL
) sub
WHERE s.user_id = sub.user_id AND sub.earliest IS NOT NULL;

-- Seed metrics rows for all profile users
INSERT INTO public.user_journey_metrics (user_id, signup_at, updated_at)
SELECT p.user_id, u.created_at, now()
FROM public.user_profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- App opens from activity logs
UPDATE public.user_journey_state s SET first_app_open_at = sub.ts
FROM (
  SELECT user_id, MIN(created_at) AS ts
  FROM public.user_activity_logs
  WHERE action IN ('app_opened', 'page_view')
  GROUP BY user_id
) sub
WHERE s.user_id = sub.user_id AND s.first_app_open_at IS NULL;

UPDATE public.user_journey_metrics m SET
  total_sessions = COALESCE(sub.cnt, 0),
  last_active_at = sub.last_ts
FROM (
  SELECT
    user_id,
    COUNT(DISTINCT session_id) FILTER (WHERE action = 'app_opened') AS cnt,
    MAX(created_at) AS last_ts
  FROM public.user_activity_logs
  GROUP BY user_id
) sub
WHERE m.user_id = sub.user_id;
