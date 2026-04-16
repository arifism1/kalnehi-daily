-- Fix: PostgREST 1,000-row cap causes UPSC Mains picker/tracker to be truncated.
-- Two RPCs:
--   1. upsc_cse_mains_optional_subjects() — distinct clean base names (≤ 11 rows)
--   2. upsc_cse_mains_syllabus_rows(p_optional) — filtered + DISTINCT ON deduped
--      rows for the tracker (common papers always; optional's 2 papers if selected)

-- ---------------------------------------------------------------------------
-- 1. Picker: returns distinct clean optional-subject base names.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsc_cse_mains_optional_subjects()
RETURNS TABLE(base_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    TRIM(
      regexp_replace(subject, '\s*\(Optional\)\s*-\s*Paper\s+[IVXivx]+\s*$', '', 'i')
    ) AS base_name
  FROM public.syllabus_master
  WHERE exam_name = 'UPSC CSE Mains'
    AND subject ILIKE '%(Optional)%'
  ORDER BY 1
$$;

GRANT EXECUTE ON FUNCTION public.upsc_cse_mains_optional_subjects() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tracker: filtered + deduped UPSC Mains rows.
--    - Common papers (not optional): always included.
--    - Optional papers: included only when p_optional matches base name.
--    - DISTINCT ON (subject, chapter, microtopic) removes catalog duplicates
--      so the result stays well within PostgREST's 1,000-row cap even for
--      subjects like Geography (224 + 203 unique microtopics).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsc_cse_mains_syllabus_rows(
  p_optional text DEFAULT NULL
)
RETURNS SETOF public.syllabus_master
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (subject, chapter, microtopic) *
  FROM public.syllabus_master
  WHERE exam_name = 'UPSC CSE Mains'
    AND (
      -- Common papers (Essay, GS I–IV, Qualifying Papers)
      subject NOT ILIKE '%(Optional)%'
      -- Or: the selected optional's two papers
      OR (
        p_optional IS NOT NULL
        AND TRIM(p_optional) != ''
        AND subject ILIKE (TRIM(p_optional) || ' (Optional)%')
      )
    )
  ORDER BY subject, chapter, microtopic, id
$$;

GRANT EXECUTE ON FUNCTION public.upsc_cse_mains_syllabus_rows(text) TO authenticated;
