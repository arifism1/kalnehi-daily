-- ============================================================================
-- DB-backed cooldown tables for study-camera and study-partner API routes.
-- Fixes H-02: module-level Map() rate limiting is bypassed in multi-instance
-- serverless deployments because each instance has its own memory.
--
-- Pattern mirrors prepbrain_chat_cooldown (service-role only, RLS enabled).
-- ============================================================================

-- Study camera cooldown -------------------------------------------------

CREATE TABLE IF NOT EXISTS public.study_camera_cooldown (
  user_id        uuid        NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  last_request_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.study_camera_cooldown IS
  'Last study-camera /verify API request time per user; used for multi-instance rate limiting. Service-role only.';

ALTER TABLE public.study_camera_cooldown ENABLE ROW LEVEL SECURITY;

-- No client-accessible policies — service_role bypasses RLS.

-- Study partner cooldown ------------------------------------------------

CREATE TABLE IF NOT EXISTS public.study_partner_cooldown (
  user_id        uuid        NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  last_request_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.study_partner_cooldown IS
  'Last study-partner /feedback API request time per user; used for multi-instance rate limiting. Service-role only.';

ALTER TABLE public.study_partner_cooldown ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Waitlist join rate limit table (H-01)
-- Tracks per-IP attempt counts in 10-minute windows to prevent email flooding.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.waitlist_join_rate_limits (
  ip_hash      text        NOT NULL,
  window_start timestamptz NOT NULL,
  attempt_count integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, window_start)
);

COMMENT ON TABLE public.waitlist_join_rate_limits IS
  'Per-IP rate limit counters for POST /api/waitlist/join. Keyed by SHA-256 of the IP and 10-min window bucket. Service-role only.';

ALTER TABLE public.waitlist_join_rate_limits ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: delete rows older than 1 hour to keep the table tiny.
-- This is handled in application code; the table has no explicit TTL policy.
-- A cron job or DELETE WHERE window_start < now() - interval '1 hour' suffices.
