-- NEET UG: add marks_2026 column and seed 2026 chapter weights (adjusted marks on 720 scale:
-- Physics 180, Chemistry 180, Biology 360). Maps user topic buckets to NCERT UNIT chapters
-- in chapter_marks; split rows were merged per catalog chapter.

ALTER TABLE public.chapter_marks
  ADD COLUMN IF NOT EXISTS marks_2026 numeric;

ALTER TABLE public.user_syllabus_marks_overrides
  ADD COLUMN IF NOT EXISTS marks_2026 numeric;

COMMENT ON COLUMN public.chapter_marks.marks_2026 IS
  'Optional chapter weight for a fourth exam year (e.g. NEET UG 2026 projection).';

COMMENT ON COLUMN public.user_syllabus_marks_overrides.marks_2026 IS
  'User override for marks_2026; NULL uses chapter_marks / catalog.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Analysis view: expose marks_2026 without changing existing year_1/2/3 semantics.
-- ─────────────────────────────────────────────────────────────────────────────
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
  0                                                              AS marks_allocated,
  COALESCE(cm.marks_2026, 0)                                    AS marks_2026,
  COALESCE(cm.marks_2025, 0)                                    AS weightage_year_1,
  COALESCE(cm.marks_2024, 0)                                    AS weightage_year_2,
  COALESCE(cm.marks_2023, 0)                                    AS weightage_year_3,
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
  'Flattened exam/chapter/microtopic analysis with chapter weights from chapter_marks. '
  'marks_2026 is the optional fourth year; chapter_marks_year_1/2/3 remain 2025/2024/2023.';

-- ─────────────────────────────────────────────────────────────────────────────
-- prepbrain_marks_intelligence: include 2026 in output and filter.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.prepbrain_marks_intelligence(uuid, text, integer);
DROP FUNCTION IF EXISTS public.prepbrain_marks_intelligence(uuid, text, int);

CREATE FUNCTION public.prepbrain_marks_intelligence(
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
  marks_2026     int,
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
      COALESCE(cm.marks_2026::int, 0) AS marks_2026,
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
      AND (
           cm.marks_2026 > 0 OR cm.marks_2025 > 0
        OR cm.marks_2024 > 0 OR cm.marks_2023 > 0
      )
    GROUP BY sm.subject, sm.chapter, cm.marks_2023, cm.marks_2024, cm.marks_2025, cm.marks_2026
  )
  SELECT
    subject,
    chapter,
    marks_2023,
    marks_2024,
    marks_2025,
    marks_2026,
    total_topics,
    done_topics,
    CASE WHEN total_topics > 0
         THEN ROUND(done_topics * 100.0 / total_topics)::int
         ELSE 0
    END AS completion_pct
  FROM cs
  ORDER BY
    COALESCE(NULLIF(marks_2026, 0), NULLIF(marks_2025, 0), NULLIF(marks_2024, 0), NULLIF(marks_2023, 0), 0)::numeric
    * (1.0 - done_topics::numeric / NULLIF(total_topics, 0))
    DESC NULLS LAST
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.prepbrain_marks_intelligence(uuid, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepbrain_marks_intelligence(uuid, text, int) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed NEET UG marks_2026 (explicit per-UNIT breakdown). `chapter` must match `syllabus_master`.
-- Totals from sheet: Physics 180, Chemistry 179, Biology 360 (combined 719).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.chapter_marks SET marks_2026 = NULL WHERE exam_name = 'NEET UG';

UPDATE public.chapter_marks SET marks_2026 = v.m
FROM (VALUES
  -- Physics
  ('NEET UG', 'Physics', 'UNIT 1: UNITS AND MEASUREMENTS', 4),
  ('NEET UG', 'Physics', 'UNIT 2: KINEMATICS', 3),
  ('NEET UG', 'Physics', 'UNIT 3: LAWS OF MOTION', 11),
  ('NEET UG', 'Physics', 'UNIT 4: WORK, ENERGY AND POWER', 7),
  ('NEET UG', 'Physics', 'UNIT 5: ROTATIONAL MOTION', 17),
  ('NEET UG', 'Physics', 'UNIT 6: GRAVITATION', 7),
  ('NEET UG', 'Physics', 'UNIT 7: PROPERTIES OF SOLIDS AND LIQUIDS', 14),
  ('NEET UG', 'Physics', 'UNIT 8: THERMODYNAMICS', 11),
  ('NEET UG', 'Physics', 'UNIT 9: KINETIC THEORY OF GASES', 4),
  ('NEET UG', 'Physics', 'UNIT 10: OSCILLATIONS AND WAVES', 11),
  ('NEET UG', 'Physics', 'UNIT 11: ELECTROSTATICS', 11),
  ('NEET UG', 'Physics', 'UNIT 12: CURRENT ELECTRICITY', 11),
  ('NEET UG', 'Physics', 'UNIT 13: MAGNETIC EFFECTS OF CURRENT AND MAGNETISM', 11),
  ('NEET UG', 'Physics', 'UNIT 14: ELECTROMAGNETIC INDUCTION AND ALTERNATING CURRENTS', 8),
  ('NEET UG', 'Physics', 'UNIT 15: ELECTROMAGNETIC WAVES', 4),
  ('NEET UG', 'Physics', 'UNIT 16: OPTICS', 17),
  ('NEET UG', 'Physics', 'UNIT 17: DUAL NATURE OF MATTER AND RADIATION', 7),
  ('NEET UG', 'Physics', 'UNIT 18: ATOMS AND NUCLEI', 7),
  ('NEET UG', 'Physics', 'UNIT 19: ELECTRONIC DEVICES', 11),
  ('NEET UG', 'Physics', 'UNIT 20: EXPERIMENTAL SKILLS', 4),
  -- Chemistry
  ('NEET UG', 'Chemistry', 'UNIT 1: SOME BASIC CONCEPTS IN CHEMISTRY', 8),
  ('NEET UG', 'Chemistry', 'UNIT 2: ATOMIC STRUCTURE', 4),
  ('NEET UG', 'Chemistry', 'UNIT 3: CHEMICAL BONDING AND MOLECULAR STRUCTURE', 16),
  ('NEET UG', 'Chemistry', 'UNIT 4: CHEMICAL THERMODYNAMICS', 4),
  ('NEET UG', 'Chemistry', 'UNIT 5: SOLUTIONS', 9),
  ('NEET UG', 'Chemistry', 'UNIT 6: EQUILIBRIUM', 12),
  ('NEET UG', 'Chemistry', 'UNIT 7: REDOX REACTIONS AND ELECTROCHEMISTRY', 9),
  ('NEET UG', 'Chemistry', 'UNIT 8: CHEMICAL KINETICS', 9),
  ('NEET UG', 'Chemistry', 'UNIT 9: CLASSIFICATION OF ELEMENTS AND PERIODICITY IN PROPERTIES', 12),
  ('NEET UG', 'Chemistry', 'UNIT 10: p-BLOCK ELEMENTS', 12),
  ('NEET UG', 'Chemistry', 'UNIT 11: d- AND f-BLOCK ELEMENTS', 9),
  ('NEET UG', 'Chemistry', 'UNIT 12: COORDINATION COMPOUNDS', 9),
  ('NEET UG', 'Chemistry', 'UNIT 13: PURIFICATION AND CHARACTERISATION OF ORGANIC COMPOUNDS', 5),
  ('NEET UG', 'Chemistry', 'UNIT 14: SOME BASIC PRINCIPLES OF ORGANIC CHEMISTRY', 8),
  ('NEET UG', 'Chemistry', 'UNIT 15: HYDROCARBONS', 8),
  ('NEET UG', 'Chemistry', 'UNIT 16: ORGANIC COMPOUNDS CONTAINING HALOGENS', 8),
  ('NEET UG', 'Chemistry', 'UNIT 17: ORGANIC COMPOUNDS CONTAINING OXYGEN', 16),
  ('NEET UG', 'Chemistry', 'UNIT 18: ORGANIC COMPOUNDS CONTAINING NITROGEN', 8),
  ('NEET UG', 'Chemistry', 'UNIT 19: BIOMOLECULES', 8),
  ('NEET UG', 'Chemistry', 'UNIT 20: PRINCIPLES RELATED TO PRACTICAL CHEMISTRY', 5),
  -- Biology
  ('NEET UG', 'Biology', 'UNIT 1: DIVERSITY IN THE LIVING WORLD', 34),
  ('NEET UG', 'Biology', 'UNIT 2: STRUCTURAL ORGANISATION IN ANIMALS AND PLANTS', 21),
  ('NEET UG', 'Biology', 'UNIT 3: CELL STRUCTURE AND FUNCTION', 29),
  ('NEET UG', 'Biology', 'UNIT 4: PLANT PHYSIOLOGY', 38),
  ('NEET UG', 'Biology', 'UNIT 5: HUMAN PHYSIOLOGY', 58),
  ('NEET UG', 'Biology', 'UNIT 6: REPRODUCTION', 46),
  ('NEET UG', 'Biology', 'UNIT 7: GENETICS AND EVOLUTION', 66),
  ('NEET UG', 'Biology', 'UNIT 8: BIOLOGY AND HUMAN WELFARE', 9),
  ('NEET UG', 'Biology', 'UNIT 9: BIOTECHNOLOGY AND ITS APPLICATIONS', 13),
  ('NEET UG', 'Biology', 'UNIT 10: ECOLOGY AND ENVIRONMENT', 46)
) AS v(exam, subj, ch, m)
WHERE chapter_marks.exam_name = v.exam
  AND chapter_marks.subject = v.subj
  AND chapter_marks.chapter = v.ch;
