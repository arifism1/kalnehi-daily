-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260704170000_inicet_marks_trim_to_200.sql
--
-- Trims INI-CET chapter_marks totals to exactly 200 per year by subtracting
-- 1 mark from the highest-weighted chapters until the excess is absorbed.
--
-- Before (from 20260704160000):
--   marks_2023 total = 203  → remove 3 from top 3 chapters
--   marks_2024 total = 205  → remove 5 from top 5 chapters
--   marks_2025 total = 203  → remove 3 from top 3 chapters
--
-- After: all three years total exactly 200.
--
-- Chapters adjusted per year:
--   2023: Surgery group 33→32, Medicine+Derm 22→21, Pathology 21→20
--   2024: Surgery group 35→34, Medicine+Derm 26→25, Microbiology 19→18,
--         Pathology 16→15, Physiology 16→15
--   2025: Surgery group 34→33, Medicine+Derm 30→29, Microbiology 17→16
--
-- All other chapters and exams are untouched.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.chapter_marks
SET
  marks_2023 = CASE
    WHEN LOWER(chapter) LIKE '%surgery%' AND LOWER(chapter) LIKE '%orthoped%'    THEN 32
    WHEN LOWER(chapter) LIKE '%medicine%' AND LOWER(chapter) LIKE '%dermatolog%' THEN 21
    WHEN LOWER(chapter) = 'pathology'                                             THEN 20
    ELSE marks_2023
  END,
  marks_2024 = CASE
    WHEN LOWER(chapter) LIKE '%surgery%' AND LOWER(chapter) LIKE '%orthoped%'    THEN 34
    WHEN LOWER(chapter) LIKE '%medicine%' AND LOWER(chapter) LIKE '%dermatolog%' THEN 25
    WHEN LOWER(chapter) = 'microbiology'                                          THEN 18
    WHEN LOWER(chapter) = 'pathology'                                             THEN 15
    WHEN LOWER(chapter) = 'physiology'                                            THEN 15
    ELSE marks_2024
  END,
  marks_2025 = CASE
    WHEN LOWER(chapter) LIKE '%surgery%' AND LOWER(chapter) LIKE '%orthoped%'    THEN 33
    WHEN LOWER(chapter) LIKE '%medicine%' AND LOWER(chapter) LIKE '%dermatolog%' THEN 29
    WHEN LOWER(chapter) = 'microbiology'                                          THEN 16
    ELSE marks_2025
  END
WHERE exam_name = 'INI-CET';
