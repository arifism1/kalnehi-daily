-- Scale: hot paths for legacy `tasks`, `task_sessions`, and execution log RPC.
-- `user_microtopic_progress` already supports upserts on (user_id, syllabus_master_id) in app code;
-- ensure a unique btree exists in production (Supabase dashboard) if not already created.

CREATE INDEX IF NOT EXISTS tasks_user_assigned_date_idx
  ON public.tasks (user_id, assigned_date DESC);

CREATE INDEX IF NOT EXISTS task_sessions_task_end_idx
  ON public.task_sessions (task_id, end_time DESC NULLS LAST);

COMMENT ON TABLE public.tasks IS
  'Legacy academic planner tasks. Client sync uses a rolling assigned_date window; see TASKS_SERVER_SYNC_LOOKBACK_DAYS in app. Consider periodic archival of old completed rows.';

-- Single round-trip for execution log: join sessions to tasks under RLS (SECURITY INVOKER).
CREATE OR REPLACE FUNCTION public.fetch_task_sessions_for_log(
  p_since timestamptz,
  p_limit int DEFAULT 8000
)
RETURNS TABLE (
  id uuid,
  task_id uuid,
  start_time timestamptz,
  end_time timestamptz,
  duration_seconds integer,
  created_at timestamptz,
  task_name text,
  microtopic_id uuid,
  assigned_date date,
  task_status text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ts.id,
    ts.task_id,
    ts.start_time,
    ts.end_time,
    ts.duration_seconds,
    ts.created_at,
    t.name AS task_name,
    t.microtopic_id,
    t.assigned_date,
    t.status::text AS task_status
  FROM public.task_sessions ts
  INNER JOIN public.tasks t ON t.id = ts.task_id
  WHERE t.user_id = (SELECT auth.uid())
    AND ts.end_time IS NOT NULL
    AND ts.end_time >= p_since
  ORDER BY ts.end_time DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_task_sessions_for_log(timestamptz, int) TO authenticated;
