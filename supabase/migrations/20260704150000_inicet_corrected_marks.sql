-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260704150000_inicet_corrected_marks.sql
--
-- Replaces all previously-inserted INI-CET rows in exam_subject_question_history
-- with the authoritative corrected spreadsheet values, then overwrites
-- chapter_marks for INI-CET with the correct per-chapter marks.
--
-- Scale interpretation:
--   INI-CET = 200 MCQs × 1 mark = 200 actual marks.
--   The spreadsheet is at 2× scale (sums ~400 per year).
--   chapter_marks values = spreadsheet_value × 2 (→ 800-mark scale, consistent
--   with NEET PG and existing INI-CET chapter_marks entries).
--
-- Years covered:
--   2021 — new data (19 subjects, sum=400)
--   2022 — corrected (19 subjects, sum=410 — accepted as-is)
--   2023 — corrected (19 subjects, sum=400)
--   2024 — new data (19 subjects, sum=400)
--   2025 — corrected (19 subjects, sum=396 — accepted as-is)
--
-- chapter_marks update (marks_2023, marks_2024, marks_2025 only):
--   Grouped chapters:
--     "Medicine, Dermatology, & Venereology" = (Medicine + Derma) × 2
--     "Surgery, Ent, Orthopedics & Anesthesia" = (Surgery + ENT + Ortho + Anaes) × 2
--   All others: subject_value × 2
--
--   marks_2023 total = 800
--   marks_2024 total = 800
--   marks_2025 total = 792 (2025 raw sum = 396, accepted)
--
-- NEET PG is completely unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Clean out stale INI-CET history rows for all years being replaced.
--    Old entries used grouped subject names (e.g. 'Surgery, ENT, Orthopedics &
--    Anesthesia') or different naming conventions; the new rows use individual
--    discipline names consistent with the spreadsheet.
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM public.exam_subject_question_history
WHERE exam_name = 'INI-CET'
  AND year IN (2021, 2022, 2023, 2024, 2025);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Insert corrected INI-CET rows (individual subjects, shift = '')
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.exam_subject_question_history
  (exam_name, year, shift, subject, questions_min, questions_max)
VALUES
  -- 2021 (sum = 400)
  ('INI-CET', 2021, '', 'Anatomy',                  23, 23),
  ('INI-CET', 2021, '', 'Physiology',               22, 22),
  ('INI-CET', 2021, '', 'Biochemistry',             24, 24),
  ('INI-CET', 2021, '', 'Pharmacology',             35, 35),
  ('INI-CET', 2021, '', 'Microbiology',             25, 25),
  ('INI-CET', 2021, '', 'Pathology',                34, 34),
  ('INI-CET', 2021, '', 'Community Medicine',       26, 26),
  ('INI-CET', 2021, '', 'Forensic Medicine',        18, 18),
  ('INI-CET', 2021, '', 'Ophthalmology',            13, 13),
  ('INI-CET', 2021, '', 'ENT',                      10, 10),
  ('INI-CET', 2021, '', 'Medicine',                 28, 28),
  ('INI-CET', 2021, '', 'Surgery',                  29, 29),
  ('INI-CET', 2021, '', 'Obstetrics & Gynaecology', 42, 42),
  ('INI-CET', 2021, '', 'Paediatrics',              12, 12),
  ('INI-CET', 2021, '', 'Anaesthesia',              14, 14),
  ('INI-CET', 2021, '', 'Dermatology',              13, 13),
  ('INI-CET', 2021, '', 'Psychiatry',                7,  7),
  ('INI-CET', 2021, '', 'Radiology',                11, 11),
  ('INI-CET', 2021, '', 'Orthopaedics',             14, 14),

  -- 2022 (sum = 410 — accepted as-is)
  ('INI-CET', 2022, '', 'Anatomy',                  24, 24),
  ('INI-CET', 2022, '', 'Physiology',               21, 21),
  ('INI-CET', 2022, '', 'Biochemistry',             18, 18),
  ('INI-CET', 2022, '', 'Pharmacology',             38, 38),
  ('INI-CET', 2022, '', 'Microbiology',             30, 30),
  ('INI-CET', 2022, '', 'Pathology',                38, 38),
  ('INI-CET', 2022, '', 'Community Medicine',       20, 20),
  ('INI-CET', 2022, '', 'Forensic Medicine',        19, 19),
  ('INI-CET', 2022, '', 'Ophthalmology',            14, 14),
  ('INI-CET', 2022, '', 'ENT',                      10, 10),
  ('INI-CET', 2022, '', 'Medicine',                 40, 40),
  ('INI-CET', 2022, '', 'Surgery',                  32, 32),
  ('INI-CET', 2022, '', 'Obstetrics & Gynaecology', 34, 34),
  ('INI-CET', 2022, '', 'Paediatrics',              16, 16),
  ('INI-CET', 2022, '', 'Anaesthesia',              16, 16),
  ('INI-CET', 2022, '', 'Dermatology',              10, 10),
  ('INI-CET', 2022, '', 'Psychiatry',                8,  8),
  ('INI-CET', 2022, '', 'Radiology',                10, 10),
  ('INI-CET', 2022, '', 'Orthopaedics',             12, 12),

  -- 2023 (sum = 400)
  ('INI-CET', 2023, '', 'Anatomy',                  25, 25),
  ('INI-CET', 2023, '', 'Physiology',               23, 23),
  ('INI-CET', 2023, '', 'Biochemistry',             18, 18),
  ('INI-CET', 2023, '', 'Pharmacology',             34, 34),
  ('INI-CET', 2023, '', 'Microbiology',             34, 34),
  ('INI-CET', 2023, '', 'Pathology',                41, 41),
  ('INI-CET', 2023, '', 'Community Medicine',       22, 22),
  ('INI-CET', 2023, '', 'Forensic Medicine',        20, 20),
  ('INI-CET', 2023, '', 'Ophthalmology',            14, 14),
  ('INI-CET', 2023, '', 'ENT',                      14, 14),
  ('INI-CET', 2023, '', 'Medicine',                 38, 38),
  ('INI-CET', 2023, '', 'Surgery',                  31, 31),
  ('INI-CET', 2023, '', 'Obstetrics & Gynaecology', 28, 28),
  ('INI-CET', 2023, '', 'Paediatrics',              17, 17),
  ('INI-CET', 2023, '', 'Anaesthesia',               6,  6),
  ('INI-CET', 2023, '', 'Dermatology',               6,  6),
  ('INI-CET', 2023, '', 'Psychiatry',                7,  7),
  ('INI-CET', 2023, '', 'Radiology',                 8,  8),
  ('INI-CET', 2023, '', 'Orthopaedics',             14, 14),

  -- 2024 (sum = 400)
  ('INI-CET', 2024, '', 'Anatomy',                  24, 24),
  ('INI-CET', 2024, '', 'Physiology',               31, 31),
  ('INI-CET', 2024, '', 'Biochemistry',             19, 19),
  ('INI-CET', 2024, '', 'Pharmacology',             24, 24),
  ('INI-CET', 2024, '', 'Microbiology',             37, 37),
  ('INI-CET', 2024, '', 'Pathology',                31, 31),
  ('INI-CET', 2024, '', 'Community Medicine',       15, 15),
  ('INI-CET', 2024, '', 'Forensic Medicine',        12, 12),
  ('INI-CET', 2024, '', 'Ophthalmology',            22, 22),
  ('INI-CET', 2024, '', 'ENT',                      13, 13),
  ('INI-CET', 2024, '', 'Medicine',                 44, 44),
  ('INI-CET', 2024, '', 'Surgery',                  33, 33),
  ('INI-CET', 2024, '', 'Obstetrics & Gynaecology', 29, 29),
  ('INI-CET', 2024, '', 'Paediatrics',              25, 25),
  ('INI-CET', 2024, '', 'Anaesthesia',              12, 12),
  ('INI-CET', 2024, '', 'Dermatology',               7,  7),
  ('INI-CET', 2024, '', 'Psychiatry',                5,  5),
  ('INI-CET', 2024, '', 'Radiology',                 6,  6),
  ('INI-CET', 2024, '', 'Orthopaedics',             11, 11),

  -- 2025 (sum = 396 — accepted as-is)
  ('INI-CET', 2025, '', 'Anatomy',                  23, 23),
  ('INI-CET', 2025, '', 'Physiology',               24, 24),
  ('INI-CET', 2025, '', 'Biochemistry',             22, 22),
  ('INI-CET', 2025, '', 'Pharmacology',             26, 26),
  ('INI-CET', 2025, '', 'Microbiology',             33, 33),
  ('INI-CET', 2025, '', 'Pathology',                29, 29),
  ('INI-CET', 2025, '', 'Community Medicine',       17, 17),
  ('INI-CET', 2025, '', 'Forensic Medicine',        21, 21),
  ('INI-CET', 2025, '', 'Ophthalmology',            13, 13),
  ('INI-CET', 2025, '', 'ENT',                      10, 10),
  ('INI-CET', 2025, '', 'Medicine',                 49, 49),
  ('INI-CET', 2025, '', 'Surgery',                  39, 39),
  ('INI-CET', 2025, '', 'Obstetrics & Gynaecology', 23, 23),
  ('INI-CET', 2025, '', 'Paediatrics',              24, 24),
  ('INI-CET', 2025, '', 'Anaesthesia',               8,  8),
  ('INI-CET', 2025, '', 'Dermatology',              10, 10),
  ('INI-CET', 2025, '', 'Psychiatry',                8,  8),
  ('INI-CET', 2025, '', 'Radiology',                 7,  7),
  ('INI-CET', 2025, '', 'Orthopaedics',             10, 10)
ON CONFLICT (exam_name, year, shift, subject) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Overwrite chapter_marks for INI-CET
--
-- INI-CET chapter_marks has 15 chapters across 3 broad subjects:
--
--   Pre-Clinical: Anatomy, Physiology, Biochemistry
--   Para-Clinical: Pharmacology, Microbiology, Pathology,
--                  Social and Preventive Medicine, Forensic Medicines
--   Clinical: Medicine, Dermatology, & Venereology  ← grouped (Med + Derma)
--             Surgery, Ent, Orthopedics & Anesthesia ← grouped (Surg+ENT+Ortho+Anaes)
--             Obstetrics & Gynaecology
--             Ophthalmology
--             Pediatrics
--             Psychiatry
--             Radiodiagnosis and Radiotherapy
--
-- Matching is on LOWER(cm.chapter) (NOT cm.subject), same as the previous
-- fix migration (20260704130000_fix_inicet_chapter_marks.sql).
--
-- marks_2023 (2023 data × 2, total = 800):
--   Anat=50, Phys=46, Biochem=36, Pharm=68, Micro=68, Path=82, PSM=44,
--   FM=40, Med+Derm=(38+6)×2=88, OBG=56, Ophthal=28, Paeds=34,
--   Psych=14, Radio=16, Surg+ENT+Ortho+Anaes=(31+14+14+6)×2=130
--
-- marks_2024 (2024 data × 2, total = 800):
--   Anat=48, Phys=62, Biochem=38, Pharm=48, Micro=74, Path=62, PSM=30,
--   FM=24, Med+Derm=(44+7)×2=102, OBG=58, Ophthal=44, Paeds=50,
--   Psych=10, Radio=12, Surg+ENT+Ortho+Anaes=(33+13+11+12)×2=138
--
-- marks_2025 (2025 data × 2, total = 792 — raw sum 396 accepted):
--   Anat=46, Phys=48, Biochem=44, Pharm=52, Micro=66, Path=58, PSM=34,
--   FM=42, Med+Derm=(49+10)×2=118, OBG=46, Ophthal=26, Paeds=48,
--   Psych=16, Radio=14, Surg+ENT+Ortho+Anaes=(39+10+10+8)×2=134
--
-- Only INI-CET rows are updated; every other exam is untouched.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.chapter_marks cm
SET
  marks_2023 = CASE
    -- Pre-Clinical
    WHEN LOWER(cm.chapter) = 'anatomy'                                           THEN  50
    WHEN LOWER(cm.chapter) = 'physiology'                                        THEN  46
    WHEN LOWER(cm.chapter) = 'biochemistry'                                      THEN  36
    -- Para-Clinical
    WHEN LOWER(cm.chapter) = 'pharmacology'                                      THEN  68
    WHEN LOWER(cm.chapter) = 'microbiology'                                      THEN  68
    WHEN LOWER(cm.chapter) = 'pathology'                                         THEN  82
    WHEN LOWER(cm.chapter) LIKE '%social%'     OR LOWER(cm.chapter) LIKE '%preventive%'
                                                                                 THEN  44
    WHEN LOWER(cm.chapter) LIKE '%forensic%'                                     THEN  40
    -- Clinical — grouped
    WHEN LOWER(cm.chapter) LIKE '%medicine%'   AND LOWER(cm.chapter) LIKE '%dermatolog%'
                                                                                 THEN  88
    WHEN LOWER(cm.chapter) LIKE '%surgery%'    AND LOWER(cm.chapter) LIKE '%orthoped%'
                                                                                 THEN 130
    -- Clinical — individual
    WHEN LOWER(cm.chapter) LIKE '%obstetric%'  OR  LOWER(cm.chapter) LIKE '%gynaecolog%'
      OR LOWER(cm.chapter) LIKE '%gynecolog%'                                    THEN  56
    WHEN LOWER(cm.chapter) LIKE '%ophthalmolog%'                                 THEN  28
    WHEN LOWER(cm.chapter) LIKE '%ediatric%'                                     THEN  34
    WHEN LOWER(cm.chapter) LIKE '%psychiatry%'                                   THEN  14
    WHEN LOWER(cm.chapter) LIKE '%radiodiagno%'                                  THEN  16
    ELSE marks_2023
  END,
  marks_2024 = CASE
    WHEN LOWER(cm.chapter) = 'anatomy'                                           THEN  48
    WHEN LOWER(cm.chapter) = 'physiology'                                        THEN  62
    WHEN LOWER(cm.chapter) = 'biochemistry'                                      THEN  38
    WHEN LOWER(cm.chapter) = 'pharmacology'                                      THEN  48
    WHEN LOWER(cm.chapter) = 'microbiology'                                      THEN  74
    WHEN LOWER(cm.chapter) = 'pathology'                                         THEN  62
    WHEN LOWER(cm.chapter) LIKE '%social%'     OR LOWER(cm.chapter) LIKE '%preventive%'
                                                                                 THEN  30
    WHEN LOWER(cm.chapter) LIKE '%forensic%'                                     THEN  24
    WHEN LOWER(cm.chapter) LIKE '%medicine%'   AND LOWER(cm.chapter) LIKE '%dermatolog%'
                                                                                 THEN 102
    WHEN LOWER(cm.chapter) LIKE '%surgery%'    AND LOWER(cm.chapter) LIKE '%orthoped%'
                                                                                 THEN 138
    WHEN LOWER(cm.chapter) LIKE '%obstetric%'  OR  LOWER(cm.chapter) LIKE '%gynaecolog%'
      OR LOWER(cm.chapter) LIKE '%gynecolog%'                                    THEN  58
    WHEN LOWER(cm.chapter) LIKE '%ophthalmolog%'                                 THEN  44
    WHEN LOWER(cm.chapter) LIKE '%ediatric%'                                     THEN  50
    WHEN LOWER(cm.chapter) LIKE '%psychiatry%'                                   THEN  10
    WHEN LOWER(cm.chapter) LIKE '%radiodiagno%'                                  THEN  12
    ELSE marks_2024
  END,
  marks_2025 = CASE
    WHEN LOWER(cm.chapter) = 'anatomy'                                           THEN  46
    WHEN LOWER(cm.chapter) = 'physiology'                                        THEN  48
    WHEN LOWER(cm.chapter) = 'biochemistry'                                      THEN  44
    WHEN LOWER(cm.chapter) = 'pharmacology'                                      THEN  52
    WHEN LOWER(cm.chapter) = 'microbiology'                                      THEN  66
    WHEN LOWER(cm.chapter) = 'pathology'                                         THEN  58
    WHEN LOWER(cm.chapter) LIKE '%social%'     OR LOWER(cm.chapter) LIKE '%preventive%'
                                                                                 THEN  34
    WHEN LOWER(cm.chapter) LIKE '%forensic%'                                     THEN  42
    WHEN LOWER(cm.chapter) LIKE '%medicine%'   AND LOWER(cm.chapter) LIKE '%dermatolog%'
                                                                                 THEN 118
    WHEN LOWER(cm.chapter) LIKE '%surgery%'    AND LOWER(cm.chapter) LIKE '%orthoped%'
                                                                                 THEN 134
    WHEN LOWER(cm.chapter) LIKE '%obstetric%'  OR  LOWER(cm.chapter) LIKE '%gynaecolog%'
      OR LOWER(cm.chapter) LIKE '%gynecolog%'                                    THEN  46
    WHEN LOWER(cm.chapter) LIKE '%ophthalmolog%'                                 THEN  26
    WHEN LOWER(cm.chapter) LIKE '%ediatric%'                                     THEN  48
    WHEN LOWER(cm.chapter) LIKE '%psychiatry%'                                   THEN  16
    WHEN LOWER(cm.chapter) LIKE '%radiodiagno%'                                  THEN  14
    ELSE marks_2025
  END
WHERE cm.exam_name = 'INI-CET';
