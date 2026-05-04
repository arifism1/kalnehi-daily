-- Lightweight facts for automated in-app reminders: one SECURITY INVOKER round-trip under tasks RLS.
CREATE OR REPLACE FUNCTION public.automated_notification_task_signals(p_today date)
RETURNS TABLE (
  incomplete_task_count bigint,
  today_task_total bigint,
  today_task_completed bigint,
  completion_streak integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH uid AS (
    SELECT auth.uid() AS id
  ),
  incomplete_ct AS (
    SELECT count(*)::bigint AS c
    FROM public.tasks t
    INNER JOIN uid ON t.user_id = uid.id
    WHERE t.status IS DISTINCT FROM 'completed'
  ),
  today_ct AS (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE t.status = 'completed')::bigint AS done
    FROM public.tasks t
    INNER JOIN uid ON t.user_id = uid.id
    WHERE t.assigned_date = p_today
  ),
  completed_days AS (
    SELECT DISTINCT t.assigned_date AS d
    FROM public.tasks t
    INNER JOIN uid ON t.user_id = uid.id
    WHERE t.status = 'completed'
      AND t.assigned_date <= p_today
      AND t.assigned_date >= p_today - 60
  ),
  gap AS (
    SELECT coalesce(
      (
        SELECT min(s.n)::int
        FROM generate_series(0, 60) AS s(n)
        WHERE NOT EXISTS (
          SELECT 1 FROM completed_days cd WHERE cd.d = (p_today - s.n)
        )
      ),
      61
    ) AS first_missing_offset
  )
  SELECT
    incomplete_ct.c,
    today_ct.total,
    today_ct.done,
    least(gap.first_missing_offset, 30)::integer
  FROM incomplete_ct,
    today_ct,
    gap;
$$;

COMMENT ON FUNCTION public.automated_notification_task_signals(date)
  IS 'Open-tasks count, today task totals, and consecutive completion days ending on p_today (max 30) for automated user_notifications inserts.';

GRANT EXECUTE ON FUNCTION public.automated_notification_task_signals(date) TO authenticated;
