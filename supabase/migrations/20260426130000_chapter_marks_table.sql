-- Move marks from per-microtopic rows to a dedicated chapter-level table.
--
-- Problem: syllabus_master stored marks_2025/2024/2023 on EVERY microtopic row,
-- duplicating the chapter's weight across all its microtopics. TypeScript's
-- chapterMarksPoolForYearRows deduped it, but SQL SUMs (PrepBrain RPC, analysis
-- view) overcounted by (microtopic_count × chapter_marks).
--
-- Fix:
--   1. Create chapter_marks with one row per (exam_name, subject, chapter).
--   2. Populate it from syllabus_master using MAX per chapter (since all
--      microtopics in a chapter carried the same value, MAX = correct weight).
--   3. Zero out marks on syllabus_master so microtopics have no marks.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create the chapter_marks table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chapter_marks (
  exam_name  text    NOT NULL,
  subject    text    NOT NULL,
  chapter    text    NOT NULL,
  marks_2025 numeric,
  marks_2024 numeric,
  marks_2023 numeric,
  PRIMARY KEY (exam_name, subject, chapter)
);

COMMENT ON TABLE public.chapter_marks IS
  'Canonical marks allocation per chapter per exam year. '
  'One row per (exam_name, subject, chapter). '
  'Replaces the previous pattern of stamping marks on every syllabus_master row.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Enable RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.chapter_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapter_marks_read_authenticated"
  ON public.chapter_marks
  FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Populate from syllabus_master
--    MAX() per chapter is correct: all microtopics in a chapter shared the
--    same marks value; MAX extracts that single value.
--    NULLIF(..., 0) keeps un-seeded exams as NULL rather than 0.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.chapter_marks (exam_name, subject, chapter, marks_2025, marks_2024, marks_2023)
SELECT
  exam_name,
  subject,
  chapter,
  NULLIF(MAX(COALESCE(marks_2025, 0)), 0) AS marks_2025,
  NULLIF(MAX(COALESCE(marks_2024, 0)), 0) AS marks_2024,
  NULLIF(MAX(COALESCE(marks_2023, 0)), 0) AS marks_2023
FROM public.syllabus_master
GROUP BY exam_name, subject, chapter
ON CONFLICT (exam_name, subject, chapter) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Zero out marks on syllabus_master
--    Microtopics no longer carry marks; chapter_marks is the single source.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.syllabus_master
SET marks_2025 = 0,
    marks_2024 = 0,
    marks_2023 = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Index for fast chapter lookup
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS chapter_marks_exam_idx
  ON public.chapter_marks (exam_name);
