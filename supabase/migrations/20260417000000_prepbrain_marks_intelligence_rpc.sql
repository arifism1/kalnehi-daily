-- PrepBrain marks intelligence RPC.
-- Returns the top N chapters for a user's exam ranked by opportunity score:
--   opportunity = recent_marks_weight × (1 − completion_fraction)
-- A single GROUP BY + LEFT JOIN in Postgres avoids pulling 1000+ microtopic rows
-- into TypeScript for aggregation.

CREATE OR REPLACE FUNCTION public.prepbrain_marks_intelligence(
  p_user_id  uuid,
  p_exam_name text,
  p_limit    int DEFAULT 15
)
RETURNS TABLE (
  subject        text,
  chapter        text,
  marks_2023     int,
  marks_2024     int,
  marks_2025     int,
  total_topics   int,
  done_topics    int,
  completion_pct int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cs AS (
    SELECT
      sm.subject,
      sm.chapter,
      COALESCE(SUM(sm.marks_2023)::int, 0) AS marks_2023,
      COALESCE(SUM(sm.marks_2024)::int, 0) AS marks_2024,
      COALESCE(SUM(sm.marks_2025)::int, 0) AS marks_2025,
      COUNT(*)::int                          AS total_topics,
      COUNT(ump.syllabus_master_id)
        FILTER (WHERE ump.status = 'completed')::int AS done_topics
    FROM public.syllabus_master sm
    LEFT JOIN public.user_microtopic_progress ump
           ON ump.syllabus_master_id = sm.id
          AND ump.user_id = p_user_id
    WHERE sm.exam_name = p_exam_name
      AND (sm.marks_2025 > 0 OR sm.marks_2024 > 0 OR sm.marks_2023 > 0)
    GROUP BY sm.subject, sm.chapter
  )
  SELECT
    subject,
    chapter,
    marks_2023,
    marks_2024,
    marks_2025,
    total_topics,
    done_topics,
    CASE WHEN total_topics > 0
         THEN ROUND(done_topics * 100.0 / total_topics)::int
         ELSE 0
    END AS completion_pct
  FROM cs
  ORDER BY
    -- opportunity_score: most recent marks × uncovered fraction
    COALESCE(NULLIF(marks_2025, 0), NULLIF(marks_2024, 0), NULLIF(marks_2023, 0), 0)::numeric
    * (1.0 - done_topics::numeric / NULLIF(total_topics, 0))
    DESC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.prepbrain_marks_intelligence(uuid, text, int) TO authenticated;
