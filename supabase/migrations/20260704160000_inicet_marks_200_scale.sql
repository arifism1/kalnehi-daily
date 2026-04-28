-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260704160000_inicet_marks_200_scale.sql
--
-- Corrects the INI-CET chapter_marks scale from the previous migration
-- (20260704150000) which stored values at 800-mark scale (×2).
--
-- INI-CET = 200 MCQs × 1 mark each = 200 actual marks total.
-- The spreadsheet values sum to ~400 (2× scale), so actual marks =
-- spreadsheet_value ÷ 2 (round-half-up).
--
-- Grouped chapters in INI-CET chapter_marks:
--   "Medicine, Dermatology, & Venereology"   = (Medicine + Derma)    ÷ 2
--   "Surgery, Ent, Orthopedics & Anesthesia" = (Surgery+ENT+Ortho+Anaes) ÷ 2
--
-- marks_2023 total ≈ 203 (rounding of odd values)
-- marks_2024 total ≈ 205
-- marks_2025 total ≈ 203 (raw 2025 sum was 396)
--
-- exam_subject_question_history is unchanged.
-- NEET PG and every other exam are completely unaffected.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.chapter_marks cm
SET
  marks_2023 = CASE
    -- Pre-Clinical
    WHEN LOWER(cm.chapter) = 'anatomy'                                            THEN  13
    WHEN LOWER(cm.chapter) = 'physiology'                                         THEN  12
    WHEN LOWER(cm.chapter) = 'biochemistry'                                       THEN   9
    -- Para-Clinical
    WHEN LOWER(cm.chapter) = 'pharmacology'                                       THEN  17
    WHEN LOWER(cm.chapter) = 'microbiology'                                       THEN  17
    WHEN LOWER(cm.chapter) = 'pathology'                                          THEN  21
    WHEN LOWER(cm.chapter) LIKE '%social%'     OR LOWER(cm.chapter) LIKE '%preventive%'
                                                                                  THEN  11
    WHEN LOWER(cm.chapter) LIKE '%forensic%'                                      THEN  10
    -- Clinical — grouped
    WHEN LOWER(cm.chapter) LIKE '%medicine%'   AND LOWER(cm.chapter) LIKE '%dermatolog%'
                                                                                  THEN  22
    WHEN LOWER(cm.chapter) LIKE '%surgery%'    AND LOWER(cm.chapter) LIKE '%orthoped%'
                                                                                  THEN  33
    -- Clinical — individual
    WHEN LOWER(cm.chapter) LIKE '%obstetric%'  OR  LOWER(cm.chapter) LIKE '%gynaecolog%'
      OR LOWER(cm.chapter) LIKE '%gynecolog%'                                     THEN  14
    WHEN LOWER(cm.chapter) LIKE '%ophthalmolog%'                                  THEN   7
    WHEN LOWER(cm.chapter) LIKE '%ediatric%'                                      THEN   9
    WHEN LOWER(cm.chapter) LIKE '%psychiatry%'                                    THEN   4
    WHEN LOWER(cm.chapter) LIKE '%radiodiagno%'                                   THEN   4
    ELSE marks_2023
  END,
  marks_2024 = CASE
    WHEN LOWER(cm.chapter) = 'anatomy'                                            THEN  12
    WHEN LOWER(cm.chapter) = 'physiology'                                         THEN  16
    WHEN LOWER(cm.chapter) = 'biochemistry'                                       THEN  10
    WHEN LOWER(cm.chapter) = 'pharmacology'                                       THEN  12
    WHEN LOWER(cm.chapter) = 'microbiology'                                       THEN  19
    WHEN LOWER(cm.chapter) = 'pathology'                                          THEN  16
    WHEN LOWER(cm.chapter) LIKE '%social%'     OR LOWER(cm.chapter) LIKE '%preventive%'
                                                                                  THEN   8
    WHEN LOWER(cm.chapter) LIKE '%forensic%'                                      THEN   6
    WHEN LOWER(cm.chapter) LIKE '%medicine%'   AND LOWER(cm.chapter) LIKE '%dermatolog%'
                                                                                  THEN  26
    WHEN LOWER(cm.chapter) LIKE '%surgery%'    AND LOWER(cm.chapter) LIKE '%orthoped%'
                                                                                  THEN  35
    WHEN LOWER(cm.chapter) LIKE '%obstetric%'  OR  LOWER(cm.chapter) LIKE '%gynaecolog%'
      OR LOWER(cm.chapter) LIKE '%gynecolog%'                                     THEN  15
    WHEN LOWER(cm.chapter) LIKE '%ophthalmolog%'                                  THEN  11
    WHEN LOWER(cm.chapter) LIKE '%ediatric%'                                      THEN  13
    WHEN LOWER(cm.chapter) LIKE '%psychiatry%'                                    THEN   3
    WHEN LOWER(cm.chapter) LIKE '%radiodiagno%'                                   THEN   3
    ELSE marks_2024
  END,
  marks_2025 = CASE
    WHEN LOWER(cm.chapter) = 'anatomy'                                            THEN  12
    WHEN LOWER(cm.chapter) = 'physiology'                                         THEN  12
    WHEN LOWER(cm.chapter) = 'biochemistry'                                       THEN  11
    WHEN LOWER(cm.chapter) = 'pharmacology'                                       THEN  13
    WHEN LOWER(cm.chapter) = 'microbiology'                                       THEN  17
    WHEN LOWER(cm.chapter) = 'pathology'                                          THEN  15
    WHEN LOWER(cm.chapter) LIKE '%social%'     OR LOWER(cm.chapter) LIKE '%preventive%'
                                                                                  THEN   9
    WHEN LOWER(cm.chapter) LIKE '%forensic%'                                      THEN  11
    WHEN LOWER(cm.chapter) LIKE '%medicine%'   AND LOWER(cm.chapter) LIKE '%dermatolog%'
                                                                                  THEN  30
    WHEN LOWER(cm.chapter) LIKE '%surgery%'    AND LOWER(cm.chapter) LIKE '%orthoped%'
                                                                                  THEN  34
    WHEN LOWER(cm.chapter) LIKE '%obstetric%'  OR  LOWER(cm.chapter) LIKE '%gynaecolog%'
      OR LOWER(cm.chapter) LIKE '%gynecolog%'                                     THEN  12
    WHEN LOWER(cm.chapter) LIKE '%ophthalmolog%'                                  THEN   7
    WHEN LOWER(cm.chapter) LIKE '%ediatric%'                                      THEN  12
    WHEN LOWER(cm.chapter) LIKE '%psychiatry%'                                    THEN   4
    WHEN LOWER(cm.chapter) LIKE '%radiodiagno%'                                   THEN   4
    ELSE marks_2025
  END
WHERE cm.exam_name = 'INI-CET';
