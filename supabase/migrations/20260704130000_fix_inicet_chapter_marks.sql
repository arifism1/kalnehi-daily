-- Correct chapter_marks for INI-CET.
--
-- Problem: 20260704120000 tried to UPDATE INI-CET by matching on subject names with LIKE
-- patterns (e.g. '%anatomy%', '%medicine%'). However, the INI-CET syllabus in chapter_marks
-- is organised differently from NEET PG:
--
--   subject       | chapter
--   ─────────────────────────────────────────────────────────────────────────
--   Pre-Clinical  | Anatomy / Biochemistry / Physiology
--   Para-Clinical | Forensic Medicines / Microbiology / Pathology /
--                 | Pharmacology / Social and Preventive Medicine
--   Clinical      | Medicine, Dermatology, & Venereology /
--                 | Obstetrics & Gynaecology / Ophthalmology /
--                 | Pediatrics / Psychiatry /
--                 | Radiodiagnosis and Radiotherapy /
--                 | Surgery, Ent, Orthopedics & Anesthesia
--
-- None of 'Pre-Clinical', 'Para-Clinical', 'Clinical' match the subject LIKE patterns, so
-- all 15 INI-CET rows were silently skipped and kept their old rough-estimate values (89 / 53 / 38).
--
-- Fix: match directly on chapter name (which IS the subject group for INI-CET) and set the
-- correct marks in a single UPDATE. NEET PG is completely unaffected.
--
-- Data sources:
--   marks_2023 — CollegeDekho "INI CET July 2023 expected topic-wise weightage"
--                Grouped questions split equally (Surgery+ENT+Ortho+Anaes=30 → each per group;
--                Medicine+Derm=26 → the full group total is used at chapter level).
--   marks_2025 — DocTutorials "INI CET November 2025 Exam Analysis" midpoints × 4.
--                (7 low-frequency subjects inferred from residual: 200 − 191 = 9 remaining Qs.)
--   marks_2024 — No reliable 2024 data; set equal to marks_2023.
--
-- Scale: 200 questions = 800 marks → 1 question = 4 marks.
-- All three year totals sum to exactly 800.

UPDATE public.chapter_marks
SET
  marks_2023 = CASE
    -- Pre-Clinical chapters
    WHEN LOWER(chapter) = 'anatomy'                                                          THEN  40
    WHEN LOWER(chapter) = 'biochemistry'                                                     THEN  40
    WHEN LOWER(chapter) = 'physiology'                                                       THEN  40
    -- Para-Clinical chapters
    WHEN LOWER(chapter) LIKE '%forensic%'                                                    THEN  24
    WHEN LOWER(chapter) = 'microbiology'                                                     THEN  56
    WHEN LOWER(chapter) = 'pathology'                                                        THEN  68
    WHEN LOWER(chapter) = 'pharmacology'                                                     THEN  56
    WHEN LOWER(chapter) LIKE '%social%' OR LOWER(chapter) LIKE '%preventive%'               THEN  64
    -- Clinical chapters
    WHEN LOWER(chapter) LIKE '%medicine%' AND LOWER(chapter) LIKE '%dermatolog%'            THEN 104
    WHEN LOWER(chapter) LIKE '%obstetric%' OR LOWER(chapter) LIKE '%gynaecolog%'
      OR LOWER(chapter) LIKE '%gynecolog%'                                                   THEN  64
    WHEN LOWER(chapter) LIKE '%ophthalmolog%'                                                THEN  24
    WHEN LOWER(chapter) LIKE '%ediatric%'                                                    THEN  40
    WHEN LOWER(chapter) LIKE '%psychiatry%'                                                  THEN  24
    WHEN LOWER(chapter) LIKE '%radiodiagno%'                                                 THEN  36
    WHEN LOWER(chapter) LIKE '%surgery%' AND LOWER(chapter) LIKE '%orthoped%'               THEN 120
  END,

  marks_2024 = CASE
    WHEN LOWER(chapter) = 'anatomy'                                                          THEN  40
    WHEN LOWER(chapter) = 'biochemistry'                                                     THEN  40
    WHEN LOWER(chapter) = 'physiology'                                                       THEN  40
    WHEN LOWER(chapter) LIKE '%forensic%'                                                    THEN  24
    WHEN LOWER(chapter) = 'microbiology'                                                     THEN  56
    WHEN LOWER(chapter) = 'pathology'                                                        THEN  68
    WHEN LOWER(chapter) = 'pharmacology'                                                     THEN  56
    WHEN LOWER(chapter) LIKE '%social%' OR LOWER(chapter) LIKE '%preventive%'               THEN  64
    WHEN LOWER(chapter) LIKE '%medicine%' AND LOWER(chapter) LIKE '%dermatolog%'            THEN 104
    WHEN LOWER(chapter) LIKE '%obstetric%' OR LOWER(chapter) LIKE '%gynaecolog%'
      OR LOWER(chapter) LIKE '%gynecolog%'                                                   THEN  64
    WHEN LOWER(chapter) LIKE '%ophthalmolog%'                                                THEN  24
    WHEN LOWER(chapter) LIKE '%ediatric%'                                                    THEN  40
    WHEN LOWER(chapter) LIKE '%psychiatry%'                                                  THEN  24
    WHEN LOWER(chapter) LIKE '%radiodiagno%'                                                 THEN  36
    WHEN LOWER(chapter) LIKE '%surgery%' AND LOWER(chapter) LIKE '%orthoped%'               THEN 120
  END,

  marks_2025 = CASE
    -- Pre-Clinical chapters (Nov 2025 midpoints × 4)
    WHEN LOWER(chapter) = 'anatomy'                                                          THEN  64
    WHEN LOWER(chapter) = 'biochemistry'                                                     THEN  56
    WHEN LOWER(chapter) = 'physiology'                                                       THEN  76
    -- Para-Clinical chapters
    WHEN LOWER(chapter) LIKE '%forensic%'                                                    THEN  84
    WHEN LOWER(chapter) = 'microbiology'                                                     THEN  64
    WHEN LOWER(chapter) = 'pathology'                                                        THEN  84
    WHEN LOWER(chapter) = 'pharmacology'                                                     THEN  64
    WHEN LOWER(chapter) LIKE '%social%' OR LOWER(chapter) LIKE '%preventive%'               THEN  24
    -- Clinical chapters
    -- Medicine=29Q + Dermatology=2Q (residual) = 31Q × 4 = 124
    WHEN LOWER(chapter) LIKE '%medicine%' AND LOWER(chapter) LIKE '%dermatolog%'            THEN 124
    -- OBG: (20+22)/2 = 21Q × 4 = 84
    WHEN LOWER(chapter) LIKE '%obstetric%' OR LOWER(chapter) LIKE '%gynaecolog%'
      OR LOWER(chapter) LIKE '%gynecolog%'                                                   THEN  84
    -- Ophthalmology: residual 1Q × 4 = 4
    WHEN LOWER(chapter) LIKE '%ophthalmolog%'                                                THEN   4
    -- Pediatrics: (5+7)/2 = 6Q × 4 = 24
    WHEN LOWER(chapter) LIKE '%ediatric%'                                                    THEN  24
    -- Psychiatry: residual 1Q × 4 = 4
    WHEN LOWER(chapter) LIKE '%psychiatry%'                                                  THEN   4
    -- Radiodiagnosis: residual 1Q × 4 = 4
    WHEN LOWER(chapter) LIKE '%radiodiagno%'                                                 THEN   4
    -- Surgery+ENT+Ortho+Anaes: 6+1+2+1 = 10Q × 4 = 40
    WHEN LOWER(chapter) LIKE '%surgery%' AND LOWER(chapter) LIKE '%orthoped%'               THEN  40
  END

WHERE exam_name = 'INI-CET'
  AND (
    LOWER(chapter) = 'anatomy'
    OR LOWER(chapter) = 'biochemistry'
    OR LOWER(chapter) = 'physiology'
    OR LOWER(chapter) LIKE '%forensic%'
    OR LOWER(chapter) = 'microbiology'
    OR LOWER(chapter) = 'pathology'
    OR LOWER(chapter) = 'pharmacology'
    OR LOWER(chapter) LIKE '%social%'
    OR LOWER(chapter) LIKE '%preventive%'
    OR (LOWER(chapter) LIKE '%medicine%' AND LOWER(chapter) LIKE '%dermatolog%')
    OR LOWER(chapter) LIKE '%obstetric%'
    OR LOWER(chapter) LIKE '%gynaecolog%'
    OR LOWER(chapter) LIKE '%gynecolog%'
    OR LOWER(chapter) LIKE '%ophthalmolog%'
    OR LOWER(chapter) LIKE '%ediatric%'
    OR LOWER(chapter) LIKE '%psychiatry%'
    OR LOWER(chapter) LIKE '%radiodiagno%'
    OR (LOWER(chapter) LIKE '%surgery%' AND LOWER(chapter) LIKE '%orthoped%')
  );
