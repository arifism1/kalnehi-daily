-- Fix SQL objects that previously SUM'd marks across microtopic rows, causing
-- overcounting (chapter_marks × microtopic_count). Now they JOIN chapter_marks
-- directly for the correct single weight per chapter.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. exam_full_analysis_view
--    Before: chapter_stats CTE used SUM(marks_*) per chapter → overcounted.
--    After:  chapter_stats joins chapter_marks directly → one weight per chapter.
--
--    Note: sm.marks_allocated is now always 0 (microtopics have no marks).
--    Chapter-level marks are in chapter_marks_year_1/2/3.
-- ─────────────────────────────────────────────────────────────────────────────
-- DROP required because CREATE OR REPLACE cannot remove columns.
DROP VIEW IF EXISTS public.exam_full_analysis_view;

CREATE VIEW public.exam_full_analysis_view AS
SELECT
  COALESCE(e.exam_name, sm.exam_name)                           AS exam_id,
  COALESCE(e.display_name, e.exam_name, sm.exam_name)           AS exam_name,
  e.created_at::date                                             AS exam_date,
  e.max_score                                                    AS total_full_marks,
  MD5(sm.exam_name || '|' || sm.chapter)                        AS chapter_id,
  sm.chapter                                                     AS chapter_name,
  sm.id                                                          AS microtopic_id,
  sm.microtopic                                                  AS microtopic_name,
  sm.subject,
  sm.section,
  sm.weightage_tag,
  sm.relative_effort_score,
  -- Microtopic-level marks are now always 0; chapter marks live in cm.*
  0                                                              AS marks_allocated,
  COALESCE(cm.marks_2025, 0)                                    AS weightage_year_1,
  COALESCE(cm.marks_2024, 0)                                    AS weightage_year_2,
  COALESCE(cm.marks_2023, 0)                                    AS weightage_year_3,
  -- Chapter aggregates (no SUM needed — one row in chapter_marks per chapter)
  COALESCE(cm.marks_2025, 0)                                    AS chapter_marks_year_1,
  COALESCE(cm.marks_2024, 0)                                    AS chapter_marks_year_2,
  COALESCE(cm.marks_2023, 0)                                    AS chapter_marks_year_3,
  COALESCE(cm.marks_2025, 0) + COALESCE(cm.marks_2024, 0) + COALESCE(cm.marks_2023, 0)
                                                                 AS total_chapter_weightage_last_3_years,
  ROUND(
    (COALESCE(cm.marks_2025, 0) + COALESCE(cm.marks_2024, 0) + COALESCE(cm.marks_2023, 0)) / 3.0,
    2
  )                                                              AS average_chapter_weightage_last_3_years
FROM public.syllabus_master sm
LEFT JOIN public.exams e
  ON e.exam_name = sm.exam_name
LEFT JOIN public.chapter_marks cm
  ON cm.exam_name = sm.exam_name
 AND cm.subject   = sm.subject
 AND cm.chapter   = sm.chapter
ORDER BY
  COALESCE(e.display_name, e.exam_name, sm.exam_name),
  sm.chapter,
  sm.microtopic;

COMMENT ON VIEW public.exam_full_analysis_view IS
  'Flattened exam/chapter/microtopic analysis with 3-year chapter weightage (from chapter_marks). '
  'microtopic marks_allocated is always 0; use chapter_marks_year_* for chapter weights.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. prepbrain_marks_intelligence
--    Before: SUM(sm.marks_*) per (subject, chapter) → overcounted.
--    After:  JOIN chapter_marks → correct single weight per chapter.
-- ─────────────────────────────────────────────────────────────────────────────
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
      COALESCE(cm.marks_2023::int, 0) AS marks_2023,
      COALESCE(cm.marks_2024::int, 0) AS marks_2024,
      COALESCE(cm.marks_2025::int, 0) AS marks_2025,
      COUNT(*)::int                    AS total_topics,
      COUNT(ump.syllabus_master_id)
        FILTER (WHERE ump.status = 'completed')::int AS done_topics
    FROM public.syllabus_master sm
    LEFT JOIN public.chapter_marks cm
           ON cm.exam_name = p_exam_name
          AND cm.subject   = sm.subject
          AND cm.chapter   = sm.chapter
    LEFT JOIN public.user_microtopic_progress ump
           ON ump.syllabus_master_id = sm.id
          AND ump.user_id = p_user_id
    WHERE sm.exam_name = p_exam_name
      AND (cm.marks_2025 > 0 OR cm.marks_2024 > 0 OR cm.marks_2023 > 0)
    GROUP BY sm.subject, sm.chapter, cm.marks_2023, cm.marks_2024, cm.marks_2025
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
    COALESCE(NULLIF(marks_2025, 0), NULLIF(marks_2024, 0), NULLIF(marks_2023, 0), 0)::numeric
    * (1.0 - done_topics::numeric / NULLIF(total_topics, 0))
    DESC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.prepbrain_marks_intelligence(uuid, text, int) TO authenticated;
