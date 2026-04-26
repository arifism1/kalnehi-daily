-- Ensure chapter_marks stays correct after the June syllabus-marks seeding migrations
-- (20260602120000_syllabus_marks_upsc.sql and 20260602130000_syllabus_marks_tier2_exams.sql).
--
-- Problem: those migrations UPDATE syllabus_master.marks_* with chapter weights.
-- But 20260426130000 already moved the canonical marks to chapter_marks and zeroed
-- syllabus_master. In a fresh supabase db push the June migrations run after April
-- and re-populate syllabus_master.marks_*, leaving the DB in an inconsistent state.
--
-- Fix: upsert chapter_marks from whatever syllabus_master currently holds (capturing
-- any values the June migrations wrote), then re-zero syllabus_master. This migration
-- is idempotent: in production, syllabus_master.marks_* are already 0, so the upsert
-- is a no-op and the re-zero is harmless.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Upsert chapter_marks from syllabus_master
--    ON CONFLICT DO UPDATE so fresh environments pick up June seeding values.
--    In production (already zeroed) EXCLUDED.marks_* = NULL, so nothing changes.
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
ON CONFLICT (exam_name, subject, chapter) DO UPDATE
  SET marks_2025 = COALESCE(EXCLUDED.marks_2025, public.chapter_marks.marks_2025),
      marks_2024 = COALESCE(EXCLUDED.marks_2024, public.chapter_marks.marks_2024),
      marks_2023 = COALESCE(EXCLUDED.marks_2023, public.chapter_marks.marks_2023);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Re-zero syllabus_master marks — microtopics must never carry marks
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.syllabus_master
SET marks_2025 = 0,
    marks_2024 = 0,
    marks_2023 = 0;
