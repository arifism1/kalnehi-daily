-- Single-json rollup for admin Engagement dashboard (service_role only).

CREATE OR REPLACE FUNCTION public.admin_active_time_summary(p_from date, p_to date)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT COALESCE(SUM(active_seconds), 0)::bigint AS total_seconds,
           COUNT(DISTINCT user_id)::bigint AS distinct_users
    FROM public.user_app_active_time_daily
    WHERE date_ist BETWEEN p_from AND p_to
  ),
  days AS (
    SELECT date_ist AS d, SUM(active_seconds)::bigint AS s
    FROM public.user_app_active_time_daily
    WHERE date_ist BETWEEN p_from AND p_to
    GROUP BY date_ist
    ORDER BY date_ist
  )
  SELECT jsonb_build_object(
    'total_seconds', (SELECT total_seconds FROM bounds),
    'distinct_users', (SELECT distinct_users FROM bounds),
    'by_day', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('day', d::text, 'total_seconds', s))
        FROM days
      ),
      '[]'::jsonb
    )
  );
$$;

COMMENT ON FUNCTION public.admin_active_time_summary IS
  'Admin-only aggregate of user_app_active_time_daily between two IST dates (inclusive).';

REVOKE ALL ON FUNCTION public.admin_active_time_summary(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_active_time_summary(date, date) TO service_role;
