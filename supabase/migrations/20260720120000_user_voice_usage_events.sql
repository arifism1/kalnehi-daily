-- Per-billed-voice-interaction log for journey analytics (seconds + instruction count).

CREATE TABLE IF NOT EXISTS public.user_voice_usage_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  feature         text NOT NULL,
  seconds_charged integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_voice_usage_events_seconds_nonneg CHECK (seconds_charged >= 0)
);

COMMENT ON TABLE public.user_voice_usage_events IS
  'One row per billed voice interaction (command, dictate, consume, etc.) for product analytics.';

CREATE INDEX IF NOT EXISTS user_voice_usage_events_user_created_idx
  ON public.user_voice_usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_voice_usage_events_created_idx
  ON public.user_voice_usage_events (created_at DESC);

ALTER TABLE public.user_voice_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_user_voice_usage_events"
  ON public.user_voice_usage_events FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "user_voice_usage_events_service_role_all"
  ON public.user_voice_usage_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Journey rollup columns
ALTER TABLE public.user_journey_state
  ADD COLUMN IF NOT EXISTS first_voice_instruction_at timestamptz;

COMMENT ON COLUMN public.user_journey_state.first_voice_instruction_at IS
  'First billed voice interaction (any feature).';

ALTER TABLE public.user_journey_metrics
  ADD COLUMN IF NOT EXISTS voice_seconds_7d integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_instructions_7d integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_seconds_lifetime integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_instructions_lifetime integer NOT NULL DEFAULT 0;

-- Backfill instructions from historical Groq voice logs (seconds unknown)
INSERT INTO public.user_voice_usage_events (user_id, feature, seconds_charged, created_at)
SELECT
  v.user_id,
  v.feature,
  0,
  v.created_at
FROM public.voice_ai_usage_log v;

-- Recompute lifetime rollups from backfilled events
UPDATE public.user_journey_metrics m SET
  voice_instructions_lifetime = sub.cnt,
  voice_seconds_lifetime = sub.sec,
  updated_at = now()
FROM (
  SELECT
    user_id,
    COUNT(*)::integer AS cnt,
    COALESCE(SUM(seconds_charged), 0)::integer AS sec
  FROM public.user_voice_usage_events
  GROUP BY user_id
) sub
WHERE m.user_id = sub.user_id;

UPDATE public.user_journey_state s SET first_voice_instruction_at = sub.ts
FROM (
  SELECT user_id, MIN(created_at) AS ts
  FROM public.user_voice_usage_events
  GROUP BY user_id
) sub
WHERE s.user_id = sub.user_id AND s.first_voice_instruction_at IS NULL;
