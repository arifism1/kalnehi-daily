-- Remove 4724 duplicate microtopic rows from syllabus_master.
--
-- Root cause: bulk syllabus imports ran multiple times, creating identical rows
-- (same exam_name / subject / chapter / microtopic) with different UUIDs.
-- All duplicates are content-identical (same section, weightage_tag,
-- relative_effort_score). The UPSC Mains RPC already worked around this with
-- DISTINCT ON; chapter_marks (added in 20260426130000) is unaffected as it
-- joins on exam_name + subject + chapter, not on row ID.
--
-- Canonical row = MIN(id) per group (UUID alphabetical) — same ordering used
-- by the old upsc_cse_mains_syllabus_rows DISTINCT ON guard.
--
-- Affected child table: only user_microtopic_progress has 20 rows on dupe IDs.
-- All other FK children (tasks, daily_tasks, revision_logs, etc.) are empty.

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Build canonical ID mapping in a temp table
-- ─────────────────────────────────────────────────────────────────────────────
-- Note: UUID type has no MIN() in PostgreSQL; sort via ::text cast instead.
CREATE TEMP TABLE _canonical AS
SELECT
  (array_agg(id ORDER BY id::text))[1]   AS canonical_id,
  (array_agg(id ORDER BY id::text))[2:]  AS dupe_ids
FROM public.syllabus_master
GROUP BY exam_name, subject, chapter, microtopic
HAVING COUNT(*) > 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Remap user_microtopic_progress (20 rows on dupe IDs)
--
-- Case B — conflict: canonical row already has a progress record for the same
--   user. Promote the canonical record to 'completed' if the duplicate was
--   'completed', then delete the duplicate progress row.
--
-- Case A — no conflict: canonical has no record for that user.
--   Update the duplicate's syllabus_master_id to canonical.
-- ─────────────────────────────────────────────────────────────────────────────

-- Case B part 1: promote canonical to 'completed' where dupe was 'completed'
UPDATE public.user_microtopic_progress AS existing
SET   status       = 'completed',
      last_updated = GREATEST(existing.last_updated, dupe.last_updated)
FROM  public.user_microtopic_progress AS dupe
JOIN  _canonical c ON dupe.syllabus_master_id = ANY(c.dupe_ids)
WHERE existing.user_id           = dupe.user_id
  AND existing.syllabus_master_id = c.canonical_id
  AND dupe.status                 = 'completed'
  AND existing.status            != 'completed';

-- Case B part 2: delete duplicate progress rows that would conflict on remap
DELETE FROM public.user_microtopic_progress AS dupe
USING _canonical c
WHERE dupe.syllabus_master_id = ANY(c.dupe_ids)
  AND EXISTS (
    SELECT 1 FROM public.user_microtopic_progress
    WHERE user_id           = dupe.user_id
      AND syllabus_master_id = c.canonical_id
  );

-- Case A: remap remaining dupe progress rows (no conflict) to canonical
UPDATE public.user_microtopic_progress
SET   syllabus_master_id = c.canonical_id
FROM  _canonical c
WHERE syllabus_master_id = ANY(c.dupe_ids);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Delete duplicate syllabus_master rows
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM public.syllabus_master
WHERE id IN (SELECT UNNEST(dupe_ids) FROM _canonical);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4: Add UNIQUE constraint to prevent future duplicates
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.syllabus_master
  ADD CONSTRAINT syllabus_master_unique_microtopic
  UNIQUE (exam_name, subject, chapter, microtopic);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 5: Simplify upsc_cse_mains_syllabus_rows RPC
--   DISTINCT ON and the extra ORDER BY tiebreaker were only needed because of
--   the now-removed duplicate rows. The RPC becomes a straightforward filter.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsc_cse_mains_syllabus_rows(
  p_optional text DEFAULT NULL
)
RETURNS SETOF public.syllabus_master
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.syllabus_master
  WHERE exam_name = 'UPSC CSE Mains'
    AND (
      subject NOT ILIKE '%(Optional)%'
      OR (
        p_optional IS NOT NULL
        AND TRIM(p_optional) != ''
        AND subject ILIKE (TRIM(p_optional) || ' (Optional)%')
      )
    )
  ORDER BY subject, chapter, microtopic
$$;

GRANT EXECUTE ON FUNCTION public.upsc_cse_mains_syllabus_rows(text) TO authenticated;
