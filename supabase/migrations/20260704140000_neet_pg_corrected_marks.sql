-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260704140000_neet_pg_corrected_marks.sql
--
-- Replaces all previously-inserted NEET PG rows in exam_subject_question_history
-- with the authoritative corrected spreadsheet values, then overwrites
-- chapter_marks for NEET PG with the correct per-subject marks.
--
-- Years covered:
--   2021 — new data (19 subjects, total 200 Qs)
--   2022 — corrected (19 subjects, total 199 Qs — accepted as-is)
--   2023 — corrected (19 subjects, total 200 Qs)
--   2024 Shift 1 — corrected (19 subjects, total 200 Qs)
--   2025 — new real data (19 subjects, total 200 Qs)
--
-- 2024 Shift 2 rows previously inserted are left untouched (historical record).
-- INI-CET is completely unaffected.
--
-- chapter_marks update:
--   marks_2023 → 2023 Qs × 4  (total 800)
--   marks_2024 → 2024 Shift 1 Qs × 4  (total 800)
--   marks_2025 → 2025 Qs × 4  (total 800)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Upsert exam_subject_question_history for NEET PG
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.exam_subject_question_history
  (exam_name, year, shift, subject, questions_min, questions_max)
VALUES
  -- 2021 (shift = '' → single-shift exam)
  ('NEET PG', 2021, '', 'Anatomy',                  7,  7),
  ('NEET PG', 2021, '', 'Physiology',                5,  5),
  ('NEET PG', 2021, '', 'Biochemistry',             12, 12),
  ('NEET PG', 2021, '', 'Pharmacology',             16, 16),
  ('NEET PG', 2021, '', 'Microbiology',             11, 11),
  ('NEET PG', 2021, '', 'Pathology',                15, 15),
  ('NEET PG', 2021, '', 'Community Medicine',       17, 17),
  ('NEET PG', 2021, '', 'Forensic Medicine',        10, 10),
  ('NEET PG', 2021, '', 'Ophthalmology',             8,  8),
  ('NEET PG', 2021, '', 'ENT',                       6,  6),
  ('NEET PG', 2021, '', 'Medicine',                 21, 21),
  ('NEET PG', 2021, '', 'Surgery',                  18, 18),
  ('NEET PG', 2021, '', 'Obstetrics & Gynaecology', 19, 19),
  ('NEET PG', 2021, '', 'Paediatrics',               8,  8),
  ('NEET PG', 2021, '', 'Anaesthesia',               5,  5),
  ('NEET PG', 2021, '', 'Dermatology',               6,  6),
  ('NEET PG', 2021, '', 'Psychiatry',                5,  5),
  ('NEET PG', 2021, '', 'Radiology',                 5,  5),
  ('NEET PG', 2021, '', 'Orthopaedics',              6,  6),

  -- 2022 (corrected; sums to 199 — accepted)
  ('NEET PG', 2022, '', 'Anatomy',                  5,  5),
  ('NEET PG', 2022, '', 'Physiology',                6,  6),
  ('NEET PG', 2022, '', 'Biochemistry',             10, 10),
  ('NEET PG', 2022, '', 'Pharmacology',             15, 15),
  ('NEET PG', 2022, '', 'Microbiology',             11, 11),
  ('NEET PG', 2022, '', 'Pathology',                10, 10),
  ('NEET PG', 2022, '', 'Community Medicine',       12, 12),
  ('NEET PG', 2022, '', 'Forensic Medicine',         8,  8),
  ('NEET PG', 2022, '', 'Ophthalmology',             6,  6),
  ('NEET PG', 2022, '', 'ENT',                       9,  9),
  ('NEET PG', 2022, '', 'Medicine',                 23, 23),
  ('NEET PG', 2022, '', 'Surgery',                  25, 25),
  ('NEET PG', 2022, '', 'Obstetrics & Gynaecology', 25, 25),
  ('NEET PG', 2022, '', 'Paediatrics',              14, 14),
  ('NEET PG', 2022, '', 'Anaesthesia',               2,  2),
  ('NEET PG', 2022, '', 'Dermatology',               7,  7),
  ('NEET PG', 2022, '', 'Psychiatry',                2,  2),
  ('NEET PG', 2022, '', 'Radiology',                 2,  2),
  ('NEET PG', 2022, '', 'Orthopaedics',              7,  7),

  -- 2023 (corrected; total 200)
  ('NEET PG', 2023, '', 'Anatomy',                  8,  8),
  ('NEET PG', 2023, '', 'Physiology',                9,  9),
  ('NEET PG', 2023, '', 'Biochemistry',             15, 15),
  ('NEET PG', 2023, '', 'Pharmacology',             12, 12),
  ('NEET PG', 2023, '', 'Microbiology',             13, 13),
  ('NEET PG', 2023, '', 'Pathology',                12, 12),
  ('NEET PG', 2023, '', 'Community Medicine',       15, 15),
  ('NEET PG', 2023, '', 'Forensic Medicine',         8,  8),
  ('NEET PG', 2023, '', 'Ophthalmology',             8,  8),
  ('NEET PG', 2023, '', 'ENT',                       6,  6),
  ('NEET PG', 2023, '', 'Medicine',                 17, 17),
  ('NEET PG', 2023, '', 'Surgery',                  27, 27),
  ('NEET PG', 2023, '', 'Obstetrics & Gynaecology', 18, 18),
  ('NEET PG', 2023, '', 'Paediatrics',              10, 10),
  ('NEET PG', 2023, '', 'Anaesthesia',               3,  3),
  ('NEET PG', 2023, '', 'Dermatology',               4,  4),
  ('NEET PG', 2023, '', 'Psychiatry',                5,  5),
  ('NEET PG', 2023, '', 'Radiology',                 4,  4),
  ('NEET PG', 2023, '', 'Orthopaedics',              6,  6),

  -- 2024 Shift 1 (corrected; total 200)
  ('NEET PG', 2024, 'Shift 1', 'Anatomy',                  7,  7),
  ('NEET PG', 2024, 'Shift 1', 'Physiology',                7,  7),
  ('NEET PG', 2024, 'Shift 1', 'Biochemistry',             13, 13),
  ('NEET PG', 2024, 'Shift 1', 'Pharmacology',             14, 14),
  ('NEET PG', 2024, 'Shift 1', 'Microbiology',             12, 12),
  ('NEET PG', 2024, 'Shift 1', 'Pathology',                18, 18),
  ('NEET PG', 2024, 'Shift 1', 'Community Medicine',       15, 15),
  ('NEET PG', 2024, 'Shift 1', 'Forensic Medicine',        12, 12),
  ('NEET PG', 2024, 'Shift 1', 'Ophthalmology',             9,  9),
  ('NEET PG', 2024, 'Shift 1', 'ENT',                       8,  8),
  ('NEET PG', 2024, 'Shift 1', 'Medicine',                 20, 20),
  ('NEET PG', 2024, 'Shift 1', 'Surgery',                  21, 21),
  ('NEET PG', 2024, 'Shift 1', 'Obstetrics & Gynaecology', 18, 18),
  ('NEET PG', 2024, 'Shift 1', 'Paediatrics',               6,  6),
  ('NEET PG', 2024, 'Shift 1', 'Anaesthesia',               4,  4),
  ('NEET PG', 2024, 'Shift 1', 'Dermatology',               4,  4),
  ('NEET PG', 2024, 'Shift 1', 'Psychiatry',                2,  2),
  ('NEET PG', 2024, 'Shift 1', 'Radiology',                 6,  6),
  ('NEET PG', 2024, 'Shift 1', 'Orthopaedics',              4,  4),

  -- 2025 (new real data; total 200)
  ('NEET PG', 2025, '', 'Anatomy',                  10, 10),
  ('NEET PG', 2025, '', 'Physiology',                5,  5),
  ('NEET PG', 2025, '', 'Biochemistry',             11, 11),
  ('NEET PG', 2025, '', 'Pharmacology',              6,  6),
  ('NEET PG', 2025, '', 'Microbiology',             13, 13),
  ('NEET PG', 2025, '', 'Pathology',                15, 15),
  ('NEET PG', 2025, '', 'Community Medicine',       17, 17),
  ('NEET PG', 2025, '', 'Forensic Medicine',         6,  6),
  ('NEET PG', 2025, '', 'Ophthalmology',             6,  6),
  ('NEET PG', 2025, '', 'ENT',                       8,  8),
  ('NEET PG', 2025, '', 'Medicine',                 25, 25),
  ('NEET PG', 2025, '', 'Surgery',                  18, 18),
  ('NEET PG', 2025, '', 'Obstetrics & Gynaecology', 23, 23),
  ('NEET PG', 2025, '', 'Paediatrics',               7,  7),
  ('NEET PG', 2025, '', 'Anaesthesia',               4,  4),
  ('NEET PG', 2025, '', 'Dermatology',               7,  7),
  ('NEET PG', 2025, '', 'Psychiatry',                6,  6),
  ('NEET PG', 2025, '', 'Radiology',                 5,  5),
  ('NEET PG', 2025, '', 'Orthopaedics',              8,  8)
ON CONFLICT (exam_name, year, shift, subject)
  DO UPDATE SET
    questions_min = EXCLUDED.questions_min,
    questions_max = EXCLUDED.questions_max;

-- Remove stale rows that used US spelling 'Pediatrics' for the three corrected years;
-- the authoritative rows above use 'Paediatrics' (UK spelling consistent with chapter_marks).
-- 2024 Shift 2 is left untouched (historical record).
DELETE FROM public.exam_subject_question_history
WHERE exam_name = 'NEET PG'
  AND subject   = 'Pediatrics'
  AND (
        year IN (2022, 2023)
        OR (year = 2024 AND shift = 'Shift 1')
      );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Overwrite chapter_marks for NEET PG
--
-- Subject-level marks (questions × 4) applied:
--
--   marks_2023 (2023 data × 4):
--     Anatomy=32, Physiology=36, Biochemistry=60, Pharmacology=48,
--     Microbiology=52, Pathology=48, Community Medicine=60, Forensic=32,
--     Ophthalmology=32, ENT=24, Medicine=68, Surgery=108, OBG=72,
--     Paediatrics=40, Anaesthesia=12, Dermatology=16, Psychiatry=20,
--     Radiology=16, Orthopaedics=24  → total 800
--
--   marks_2024 (2024 Shift 1 × 4 — Shift 2 no longer averaged in):
--     Anatomy=28, Physiology=28, Biochemistry=52, Pharmacology=56,
--     Microbiology=48, Pathology=72, Community Medicine=60, Forensic=48,
--     Ophthalmology=36, ENT=32, Medicine=80, Surgery=84, OBG=72,
--     Paediatrics=24, Anaesthesia=16, Dermatology=16, Psychiatry=8,
--     Radiology=24, Orthopaedics=16  → total 800
--
--   marks_2025 (real 2025 data × 4):
--     Anatomy=40, Physiology=20, Biochemistry=44, Pharmacology=24,
--     Microbiology=52, Pathology=60, Community Medicine=68, Forensic=24,
--     Ophthalmology=24, ENT=32, Medicine=100, Surgery=72, OBG=92,
--     Paediatrics=28, Anaesthesia=16, Dermatology=28, Psychiatry=24,
--     Radiology=20, Orthopaedics=32  → total 800
--
-- Marks are distributed evenly across all chapters within a subject
-- (GREATEST 1 prevents any chapter from being set to 0).
-- Only NEET PG rows are updated; every other exam is untouched.
-- ─────────────────────────────────────────────────────────────────────────────
WITH neet_chapter_counts AS (
  SELECT subject, COUNT(*) AS chapters_per_subject
  FROM   public.chapter_marks
  WHERE  exam_name = 'NEET PG'
  GROUP  BY subject
),
neet_subject_marks AS (
  SELECT
    cm.subject,
    cm.chapter,
    c.chapters_per_subject,
    CASE
      WHEN LOWER(cm.subject) LIKE '%anatomy%'                                                          THEN  32
      WHEN LOWER(cm.subject) LIKE '%physiology%'                                                       THEN  36
      WHEN LOWER(cm.subject) LIKE '%biochemistry%'                                                     THEN  60
      WHEN LOWER(cm.subject) LIKE '%pharmacology%'                                                     THEN  48
      WHEN LOWER(cm.subject) LIKE '%microbiology%'                                                     THEN  52
      WHEN LOWER(cm.subject) LIKE '%pathology%'                                                        THEN  48
      WHEN LOWER(cm.subject) LIKE '%forensic%'                                                         THEN  32
      WHEN LOWER(cm.subject) LIKE '%community%' OR LOWER(cm.subject) LIKE '%preventive%'
        OR LOWER(cm.subject) LIKE '%social%'                                                           THEN  60
      WHEN LOWER(cm.subject) LIKE '%medicine%'
        AND LOWER(cm.subject) NOT LIKE '%forensic%'
        AND LOWER(cm.subject) NOT LIKE '%community%'                                                   THEN  68
      WHEN LOWER(cm.subject) LIKE '%surgery%'                                                          THEN 108
      WHEN LOWER(cm.subject) LIKE '%obstetric%' OR LOWER(cm.subject) LIKE '%gynaecolog%'
        OR LOWER(cm.subject) LIKE '%gynecolog%' OR LOWER(cm.subject) LIKE '%ob%gy%'                    THEN  72
      WHEN LOWER(cm.subject) LIKE '%paediatric%' OR LOWER(cm.subject) LIKE '%pediatric%'              THEN  40
      WHEN LOWER(cm.subject) LIKE '%ophthalmolog%' OR LOWER(cm.subject) LIKE '%eye%'                  THEN  32
      WHEN LOWER(cm.subject) LIKE '%ent%' OR LOWER(cm.subject) LIKE '%otorhinolar%'                   THEN  24
      WHEN LOWER(cm.subject) LIKE '%dermatolog%' OR LOWER(cm.subject) LIKE '%skin%'                   THEN  16
      WHEN LOWER(cm.subject) LIKE '%orthopaedic%' OR LOWER(cm.subject) LIKE '%orthopedic%'            THEN  24
      WHEN LOWER(cm.subject) LIKE '%psychiatry%' OR LOWER(cm.subject) LIKE '%mental%'                 THEN  20
      WHEN LOWER(cm.subject) LIKE '%anaesth%'    OR LOWER(cm.subject) LIKE '%anesth%'                 THEN  12
      WHEN LOWER(cm.subject) LIKE '%radiol%'     OR LOWER(cm.subject) LIKE '%imaging%'                THEN  16
    END AS sm_2023,
    CASE
      WHEN LOWER(cm.subject) LIKE '%anatomy%'                                                          THEN  28
      WHEN LOWER(cm.subject) LIKE '%physiology%'                                                       THEN  28
      WHEN LOWER(cm.subject) LIKE '%biochemistry%'                                                     THEN  52
      WHEN LOWER(cm.subject) LIKE '%pharmacology%'                                                     THEN  56
      WHEN LOWER(cm.subject) LIKE '%microbiology%'                                                     THEN  48
      WHEN LOWER(cm.subject) LIKE '%pathology%'                                                        THEN  72
      WHEN LOWER(cm.subject) LIKE '%forensic%'                                                         THEN  48
      WHEN LOWER(cm.subject) LIKE '%community%' OR LOWER(cm.subject) LIKE '%preventive%'
        OR LOWER(cm.subject) LIKE '%social%'                                                           THEN  60
      WHEN LOWER(cm.subject) LIKE '%medicine%'
        AND LOWER(cm.subject) NOT LIKE '%forensic%'
        AND LOWER(cm.subject) NOT LIKE '%community%'                                                   THEN  80
      WHEN LOWER(cm.subject) LIKE '%surgery%'                                                          THEN  84
      WHEN LOWER(cm.subject) LIKE '%obstetric%' OR LOWER(cm.subject) LIKE '%gynaecolog%'
        OR LOWER(cm.subject) LIKE '%gynecolog%' OR LOWER(cm.subject) LIKE '%ob%gy%'                    THEN  72
      WHEN LOWER(cm.subject) LIKE '%paediatric%' OR LOWER(cm.subject) LIKE '%pediatric%'              THEN  24
      WHEN LOWER(cm.subject) LIKE '%ophthalmolog%' OR LOWER(cm.subject) LIKE '%eye%'                  THEN  36
      WHEN LOWER(cm.subject) LIKE '%ent%' OR LOWER(cm.subject) LIKE '%otorhinolar%'                   THEN  32
      WHEN LOWER(cm.subject) LIKE '%dermatolog%' OR LOWER(cm.subject) LIKE '%skin%'                   THEN  16
      WHEN LOWER(cm.subject) LIKE '%orthopaedic%' OR LOWER(cm.subject) LIKE '%orthopedic%'            THEN  16
      WHEN LOWER(cm.subject) LIKE '%psychiatry%' OR LOWER(cm.subject) LIKE '%mental%'                 THEN   8
      WHEN LOWER(cm.subject) LIKE '%anaesth%'    OR LOWER(cm.subject) LIKE '%anesth%'                 THEN  16
      WHEN LOWER(cm.subject) LIKE '%radiol%'     OR LOWER(cm.subject) LIKE '%imaging%'                THEN  24
    END AS sm_2024,
    CASE
      WHEN LOWER(cm.subject) LIKE '%anatomy%'                                                          THEN  40
      WHEN LOWER(cm.subject) LIKE '%physiology%'                                                       THEN  20
      WHEN LOWER(cm.subject) LIKE '%biochemistry%'                                                     THEN  44
      WHEN LOWER(cm.subject) LIKE '%pharmacology%'                                                     THEN  24
      WHEN LOWER(cm.subject) LIKE '%microbiology%'                                                     THEN  52
      WHEN LOWER(cm.subject) LIKE '%pathology%'                                                        THEN  60
      WHEN LOWER(cm.subject) LIKE '%forensic%'                                                         THEN  24
      WHEN LOWER(cm.subject) LIKE '%community%' OR LOWER(cm.subject) LIKE '%preventive%'
        OR LOWER(cm.subject) LIKE '%social%'                                                           THEN  68
      WHEN LOWER(cm.subject) LIKE '%medicine%'
        AND LOWER(cm.subject) NOT LIKE '%forensic%'
        AND LOWER(cm.subject) NOT LIKE '%community%'                                                   THEN 100
      WHEN LOWER(cm.subject) LIKE '%surgery%'                                                          THEN  72
      WHEN LOWER(cm.subject) LIKE '%obstetric%' OR LOWER(cm.subject) LIKE '%gynaecolog%'
        OR LOWER(cm.subject) LIKE '%gynecolog%' OR LOWER(cm.subject) LIKE '%ob%gy%'                    THEN  92
      WHEN LOWER(cm.subject) LIKE '%paediatric%' OR LOWER(cm.subject) LIKE '%pediatric%'              THEN  28
      WHEN LOWER(cm.subject) LIKE '%ophthalmolog%' OR LOWER(cm.subject) LIKE '%eye%'                  THEN  24
      WHEN LOWER(cm.subject) LIKE '%ent%' OR LOWER(cm.subject) LIKE '%otorhinolar%'                   THEN  32
      WHEN LOWER(cm.subject) LIKE '%dermatolog%' OR LOWER(cm.subject) LIKE '%skin%'                   THEN  28
      WHEN LOWER(cm.subject) LIKE '%orthopaedic%' OR LOWER(cm.subject) LIKE '%orthopedic%'            THEN  32
      WHEN LOWER(cm.subject) LIKE '%psychiatry%' OR LOWER(cm.subject) LIKE '%mental%'                 THEN  24
      WHEN LOWER(cm.subject) LIKE '%anaesth%'    OR LOWER(cm.subject) LIKE '%anesth%'                 THEN  16
      WHEN LOWER(cm.subject) LIKE '%radiol%'     OR LOWER(cm.subject) LIKE '%imaging%'                THEN  20
    END AS sm_2025
  FROM   public.chapter_marks cm
  INNER  JOIN neet_chapter_counts c ON c.subject = cm.subject
  WHERE  cm.exam_name = 'NEET PG'
)
UPDATE public.chapter_marks cm
SET
  marks_2023 = GREATEST(1, ROUND(ns.sm_2023::numeric / NULLIF(ns.chapters_per_subject, 0))),
  marks_2024 = GREATEST(1, ROUND(ns.sm_2024::numeric / NULLIF(ns.chapters_per_subject, 0))),
  marks_2025 = GREATEST(1, ROUND(ns.sm_2025::numeric / NULLIF(ns.chapters_per_subject, 0)))
FROM neet_subject_marks ns
WHERE cm.exam_name = 'NEET PG'
  AND cm.subject   = ns.subject
  AND cm.chapter   = ns.chapter
  AND ns.sm_2023 IS NOT NULL
  AND ns.sm_2024 IS NOT NULL
  AND ns.sm_2025 IS NOT NULL;
