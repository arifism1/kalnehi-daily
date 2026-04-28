-- Introduce exam_subject_question_history and correct chapter_marks for NEET PG / INI-CET.
--
-- Problem: 20260602130000_syllabus_marks_tier2_exams.sql used rough CASE-block estimates
-- for NEET PG and INI-CET subject marks (e.g. Anatomy ≈ 60, Radiology ≈ 8). These don't
-- reflect actual year-wise question distributions published after each sitting.
--
-- Solution:
--   1. Create exam_subject_question_history — one row per (exam, year, shift, subject),
--      storing the raw question counts as published. This is the durable audit trail;
--      chapter_marks remains the derived canonical table consumed by the app.
--   2. Insert all available NEET PG data (2022–2024) and INI-CET data (2023, 2025).
--   3. UPDATE chapter_marks for NEET PG and INI-CET with correctly-derived values.
--      All other exams are untouched.
--
-- Shift convention (no unnecessary labels):
--   shift = ''          → single-shift year; UI must NOT show a shift label
--   shift = 'Shift 1'  → multi-shift year; UI shows the label
--   This keeps the PK valid (no NULLs) and gives the UI a cheap rule: shift !== ''
--
-- Marks scale: both NEET PG and INI-CET have 200 questions = 800 marks → ×4 per question.
-- chapter_marks.marks_2024 for NEET PG = ROUND(avg(Shift 1 Q + Shift 2 Q) × 4).
-- chapter_marks.marks_2025 for NEET PG = same as marks_2024 (no 2025 data yet).
-- chapter_marks.marks_2024 for INI-CET = same as marks_2023 (no reliable 2024 data).
-- chapter_marks.marks_2025 for INI-CET = Nov 2025 midpoints × 4 (residual 9 Q across
--   7 unlisted subjects inferred from 200 − 191 = 9 remaining questions).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create exam_subject_question_history
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_subject_question_history (
  exam_name     text     NOT NULL,
  year          smallint NOT NULL,
  shift         text     NOT NULL DEFAULT '',
  subject       text     NOT NULL,
  questions_min smallint NOT NULL,
  questions_max smallint NOT NULL,
  PRIMARY KEY (exam_name, year, shift, subject),
  CONSTRAINT chk_questions_range CHECK (questions_max >= questions_min AND questions_min >= 0)
);

COMMENT ON TABLE public.exam_subject_question_history IS
  'Raw subject-wise question counts per exam, year, and shift. '
  'shift = '''' means single-shift (no label); ''Shift 1'', ''Shift 2'' etc. for multi-shift. '
  'questions_min = questions_max for exact data; min < max for published ranges. '
  'chapter_marks is the derived canonical table; this table is the audit trail.';

COMMENT ON COLUMN public.exam_subject_question_history.shift IS
  'Empty string for single-shift exams (UI should not display a shift label). '
  '''Shift 1'', ''Shift 2'', etc. for multi-shift years.';

ALTER TABLE public.exam_subject_question_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_question_history_read_authenticated"
  ON public.exam_subject_question_history
  FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2a. Insert NEET PG data  (questions_min = questions_max = exact published count)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.exam_subject_question_history
  (exam_name, year, shift, subject, questions_min, questions_max)
VALUES
  -- ── 2022 (single sitting) ──────────────────────────────────────────────────
  ('NEET PG', 2022, '', 'Anatomy',                    8,  8),
  ('NEET PG', 2022, '', 'Physiology',                 8,  8),
  ('NEET PG', 2022, '', 'Biochemistry',              12, 12),
  ('NEET PG', 2022, '', 'Microbiology',              16, 16),
  ('NEET PG', 2022, '', 'Pathology',                 14, 14),
  ('NEET PG', 2022, '', 'Pharmacology',              14, 14),
  ('NEET PG', 2022, '', 'Forensic Medicine',          8,  8),
  ('NEET PG', 2022, '', 'Community Medicine',        19, 19),
  ('NEET PG', 2022, '', 'Ophthalmology',              8,  8),
  ('NEET PG', 2022, '', 'ENT',                        9,  9),
  ('NEET PG', 2022, '', 'Medicine',                  16, 16),
  ('NEET PG', 2022, '', 'Surgery',                   15, 15),
  ('NEET PG', 2022, '', 'Obstetrics & Gynaecology',  20, 20),
  ('NEET PG', 2022, '', 'Pediatrics',                13, 13),
  ('NEET PG', 2022, '', 'Anaesthesia',                2,  2),
  ('NEET PG', 2022, '', 'Dermatology',                7,  7),
  ('NEET PG', 2022, '', 'Psychiatry',                 2,  2),
  ('NEET PG', 2022, '', 'Orthopaedics',               7,  7),
  ('NEET PG', 2022, '', 'Radiology',                  2,  2),
  -- ── 2023 (single sitting) ──────────────────────────────────────────────────
  ('NEET PG', 2023, '', 'Anatomy',                    7,  7),
  ('NEET PG', 2023, '', 'Physiology',                 9,  9),
  ('NEET PG', 2023, '', 'Biochemistry',              13, 13),
  ('NEET PG', 2023, '', 'Microbiology',              16, 16),
  ('NEET PG', 2023, '', 'Pathology',                 18, 18),
  ('NEET PG', 2023, '', 'Pharmacology',              12, 12),
  ('NEET PG', 2023, '', 'Forensic Medicine',         10, 10),
  ('NEET PG', 2023, '', 'Community Medicine',        16, 16),
  ('NEET PG', 2023, '', 'Ophthalmology',              7,  7),
  ('NEET PG', 2023, '', 'ENT',                        6,  6),
  ('NEET PG', 2023, '', 'Medicine',                  13, 13),
  ('NEET PG', 2023, '', 'Surgery',                   22, 22),
  ('NEET PG', 2023, '', 'Obstetrics & Gynaecology',  18, 18),
  ('NEET PG', 2023, '', 'Pediatrics',                 7,  7),
  ('NEET PG', 2023, '', 'Anaesthesia',                4,  4),
  ('NEET PG', 2023, '', 'Dermatology',                7,  7),
  ('NEET PG', 2023, '', 'Psychiatry',                 5,  5),
  ('NEET PG', 2023, '', 'Orthopaedics',               6,  6),
  ('NEET PG', 2023, '', 'Radiology',                  4,  4),
  -- ── 2024 Shift 1 ──────────────────────────────────────────────────────────
  ('NEET PG', 2024, 'Shift 1', 'Anatomy',                    7,  7),
  ('NEET PG', 2024, 'Shift 1', 'Physiology',                 6,  6),
  ('NEET PG', 2024, 'Shift 1', 'Biochemistry',              14, 14),
  ('NEET PG', 2024, 'Shift 1', 'Microbiology',               8,  8),
  ('NEET PG', 2024, 'Shift 1', 'Pathology',                 16, 16),
  ('NEET PG', 2024, 'Shift 1', 'Pharmacology',               8,  8),
  ('NEET PG', 2024, 'Shift 1', 'Forensic Medicine',          9,  9),
  ('NEET PG', 2024, 'Shift 1', 'Community Medicine',        22, 22),
  ('NEET PG', 2024, 'Shift 1', 'Ophthalmology',             11, 11),
  ('NEET PG', 2024, 'Shift 1', 'ENT',                       11, 11),
  ('NEET PG', 2024, 'Shift 1', 'Medicine',                  17, 17),
  ('NEET PG', 2024, 'Shift 1', 'Surgery',                   15, 15),
  ('NEET PG', 2024, 'Shift 1', 'Obstetrics & Gynaecology',  19, 19),
  ('NEET PG', 2024, 'Shift 1', 'Pediatrics',                 7,  7),
  ('NEET PG', 2024, 'Shift 1', 'Anaesthesia',                5,  5),
  ('NEET PG', 2024, 'Shift 1', 'Dermatology',                5,  5),
  ('NEET PG', 2024, 'Shift 1', 'Psychiatry',                 6,  6),
  ('NEET PG', 2024, 'Shift 1', 'Orthopaedics',               8,  8),
  ('NEET PG', 2024, 'Shift 1', 'Radiology',                  6,  6),
  -- ── 2024 Shift 2 ──────────────────────────────────────────────────────────
  ('NEET PG', 2024, 'Shift 2', 'Anatomy',                   16, 16),
  ('NEET PG', 2024, 'Shift 2', 'Physiology',                 6,  6),
  ('NEET PG', 2024, 'Shift 2', 'Biochemistry',               9,  9),
  ('NEET PG', 2024, 'Shift 2', 'Microbiology',               8,  8),
  ('NEET PG', 2024, 'Shift 2', 'Pathology',                 21, 21),
  ('NEET PG', 2024, 'Shift 2', 'Pharmacology',              18, 18),
  ('NEET PG', 2024, 'Shift 2', 'Forensic Medicine',          4,  4),
  ('NEET PG', 2024, 'Shift 2', 'Community Medicine',        15, 15),
  ('NEET PG', 2024, 'Shift 2', 'Ophthalmology',              8,  8),
  ('NEET PG', 2024, 'Shift 2', 'ENT',                        6,  6),
  ('NEET PG', 2024, 'Shift 2', 'Medicine',                  17, 17),
  ('NEET PG', 2024, 'Shift 2', 'Surgery',                   12, 12),
  ('NEET PG', 2024, 'Shift 2', 'Obstetrics & Gynaecology',  20, 20),
  ('NEET PG', 2024, 'Shift 2', 'Pediatrics',                 8,  8),
  ('NEET PG', 2024, 'Shift 2', 'Anaesthesia',                5,  5),
  ('NEET PG', 2024, 'Shift 2', 'Dermatology',                5,  5),
  ('NEET PG', 2024, 'Shift 2', 'Psychiatry',                 6,  6),
  ('NEET PG', 2024, 'Shift 2', 'Orthopaedics',               7,  7),
  ('NEET PG', 2024, 'Shift 2', 'Radiology',                  9,  9)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2b. Insert INI-CET data
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.exam_subject_question_history
  (exam_name, year, shift, subject, questions_min, questions_max)
VALUES
  -- ── July 2023 (single sitting) ─────────────────────────────────────────────
  -- Source: CollegeDekho "INI CET July 2023 expected topic-wise weightage"
  -- Grouped "Surgery, ENT, Orthopaedics & Anaesthesia = 30 Qs" → equal split (8,7,8,7)
  -- Grouped "Medicine, Dermatology & Venereology = 26 Qs"      → equal split (13,13)
  ('INI-CET', 2023, '', 'Anatomy',                   10, 10),
  ('INI-CET', 2023, '', 'Physiology',                10, 10),
  ('INI-CET', 2023, '', 'Biochemistry',              10, 10),
  ('INI-CET', 2023, '', 'Pathology',                 17, 17),
  ('INI-CET', 2023, '', 'Pharmacology',              14, 14),
  ('INI-CET', 2023, '', 'Microbiology',              14, 14),
  ('INI-CET', 2023, '', 'Community Medicine',        16, 16),
  ('INI-CET', 2023, '', 'Forensic Medicine',          6,  6),
  ('INI-CET', 2023, '', 'Medicine',                  13, 13),
  ('INI-CET', 2023, '', 'Dermatology',               13, 13),
  ('INI-CET', 2023, '', 'Obstetrics & Gynaecology',  16, 16),
  ('INI-CET', 2023, '', 'Pediatrics',                10, 10),
  ('INI-CET', 2023, '', 'Surgery',                    8,  8),
  ('INI-CET', 2023, '', 'ENT',                        7,  7),
  ('INI-CET', 2023, '', 'Orthopaedics',               8,  8),
  ('INI-CET', 2023, '', 'Anaesthesia',                7,  7),
  ('INI-CET', 2023, '', 'Ophthalmology',              6,  6),
  ('INI-CET', 2023, '', 'Radiology',                  9,  9),
  ('INI-CET', 2023, '', 'Psychiatry',                 6,  6),
  -- ── Nov 2025 (single sitting) ──────────────────────────────────────────────
  -- Source: DocTutorials "INI CET November 2025 Exam Analysis" (actual, post-exam)
  -- 12 subjects listed explicitly as published ranges (questions_min, questions_max)
  ('INI-CET', 2025, '', 'Anatomy',                   15, 17),
  ('INI-CET', 2025, '', 'Physiology',                18, 20),
  ('INI-CET', 2025, '', 'Biochemistry',              13, 15),
  ('INI-CET', 2025, '', 'Pathology',                 20, 22),
  ('INI-CET', 2025, '', 'Pharmacology',              15, 17),
  ('INI-CET', 2025, '', 'Microbiology',              15, 17),
  ('INI-CET', 2025, '', 'Forensic Medicine',         20, 22),
  ('INI-CET', 2025, '', 'Surgery',                    5,  7),
  ('INI-CET', 2025, '', 'Medicine',                  28, 30),
  ('INI-CET', 2025, '', 'Pediatrics',                 5,  7),
  ('INI-CET', 2025, '', 'Obstetrics & Gynaecology',  20, 22),
  ('INI-CET', 2025, '', 'Community Medicine',         5,  7),
  -- 7 subjects absent from Nov 2025 analysis; inferred from residual
  -- (200 total − 191 listed-subject midpoints = 9 remaining Qs: Derm=2, Ortho=2, rest=1 each)
  ('INI-CET', 2025, '', 'Dermatology',                2,  2),
  ('INI-CET', 2025, '', 'Orthopaedics',               2,  2),
  ('INI-CET', 2025, '', 'ENT',                        1,  1),
  ('INI-CET', 2025, '', 'Ophthalmology',              1,  1),
  ('INI-CET', 2025, '', 'Psychiatry',                 1,  1),
  ('INI-CET', 2025, '', 'Anaesthesia',                1,  1),
  ('INI-CET', 2025, '', 'Radiology',                  1,  1)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Correct chapter_marks for NEET PG
--
-- Subject marks (questions × 4) used per year:
--   marks_2023 → 2023 single-shift data
--   marks_2024 → ROUND(avg(Shift 1, Shift 2) × 4)  [sum both shifts / 2 * 4]
--   marks_2025 → same as marks_2024 (no 2025 exam data yet)
--
-- Per-chapter weight = subject_marks / chapters_per_subject (GREATEST 1)
-- Subjects that match no CASE clause keep their existing value (via IS NOT NULL guard).
-- No other exam is touched.
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
    -- marks_2023: 2023 single-shift question counts × 4
    CASE
      WHEN LOWER(cm.subject) LIKE '%anatomy%'                                                           THEN  28
      WHEN LOWER(cm.subject) LIKE '%physiology%'                                                        THEN  36
      WHEN LOWER(cm.subject) LIKE '%biochemistry%'                                                      THEN  52
      WHEN LOWER(cm.subject) LIKE '%microbiology%'                                                      THEN  64
      WHEN LOWER(cm.subject) LIKE '%pathology%'                                                         THEN  72
      WHEN LOWER(cm.subject) LIKE '%pharmacology%'                                                      THEN  48
      WHEN LOWER(cm.subject) LIKE '%forensic%'                                                          THEN  40
      WHEN LOWER(cm.subject) LIKE '%community%' OR LOWER(cm.subject) LIKE '%preventive%'
        OR LOWER(cm.subject) LIKE '%social%'                                                            THEN  64
      WHEN LOWER(cm.subject) LIKE '%medicine%'
        AND LOWER(cm.subject) NOT LIKE '%forensic%'
        AND LOWER(cm.subject) NOT LIKE '%community%'                                                    THEN  52
      WHEN LOWER(cm.subject) LIKE '%surgery%'                                                           THEN  88
      WHEN LOWER(cm.subject) LIKE '%obstetric%' OR LOWER(cm.subject) LIKE '%gynaecolog%'
        OR LOWER(cm.subject) LIKE '%gynecolog%' OR LOWER(cm.subject) LIKE '%ob%gy%'                     THEN  72
      WHEN LOWER(cm.subject) LIKE '%paediatric%' OR LOWER(cm.subject) LIKE '%pediatric%'               THEN  28
      WHEN LOWER(cm.subject) LIKE '%ophthalmolog%' OR LOWER(cm.subject) LIKE '%eye%'                   THEN  28
      WHEN LOWER(cm.subject) LIKE '%ent%' OR LOWER(cm.subject) LIKE '%otorhinolar%'                    THEN  24
      WHEN LOWER(cm.subject) LIKE '%dermatolog%' OR LOWER(cm.subject) LIKE '%skin%'                    THEN  28
      WHEN LOWER(cm.subject) LIKE '%orthopaedic%' OR LOWER(cm.subject) LIKE '%orthopedic%'             THEN  24
      WHEN LOWER(cm.subject) LIKE '%psychiatry%' OR LOWER(cm.subject) LIKE '%mental%'                  THEN  20
      WHEN LOWER(cm.subject) LIKE '%anaesth%'    OR LOWER(cm.subject) LIKE '%anesth%'                  THEN  16
      WHEN LOWER(cm.subject) LIKE '%radiol%'     OR LOWER(cm.subject) LIKE '%imaging%'                 THEN  16
    END AS sm_2023,
    -- marks_2024: average of Shift 1 + Shift 2 question counts × 4
    -- Shift 1: Anatomy=7, Phys=6, Biochem=14, Micro=8, Path=16, Pharm=8, FM=9, PSM=22, Ophthal=11,
    --          ENT=11, Med=17, Surg=15, OBG=19, Paeds=7, Anaes=5, Derm=5, Psych=6, Ortho=8, Rad=6
    -- Shift 2: Anatomy=16,Phys=6, Biochem=9,  Micro=8, Path=21, Pharm=18,FM=4, PSM=15, Ophthal=8,
    --          ENT=6,  Med=17, Surg=12, OBG=20, Paeds=8, Anaes=5, Derm=5, Psych=6, Ortho=7,  Rad=9
    -- avg×4:   Anat=46,Phys=24,Biochem=46,Micro=32,Path=74,Pharm=52,FM=26,PSM=74, Ophthal=38,
    --          ENT=34, Med=68,  Surg=54, OBG=78, Paeds=30,Anaes=20,Derm=20,Psych=24,Ortho=30,Rad=30
    CASE
      WHEN LOWER(cm.subject) LIKE '%anatomy%'                                                           THEN  46
      WHEN LOWER(cm.subject) LIKE '%physiology%'                                                        THEN  24
      WHEN LOWER(cm.subject) LIKE '%biochemistry%'                                                      THEN  46
      WHEN LOWER(cm.subject) LIKE '%microbiology%'                                                      THEN  32
      WHEN LOWER(cm.subject) LIKE '%pathology%'                                                         THEN  74
      WHEN LOWER(cm.subject) LIKE '%pharmacology%'                                                      THEN  52
      WHEN LOWER(cm.subject) LIKE '%forensic%'                                                          THEN  26
      WHEN LOWER(cm.subject) LIKE '%community%' OR LOWER(cm.subject) LIKE '%preventive%'
        OR LOWER(cm.subject) LIKE '%social%'                                                            THEN  74
      WHEN LOWER(cm.subject) LIKE '%medicine%'
        AND LOWER(cm.subject) NOT LIKE '%forensic%'
        AND LOWER(cm.subject) NOT LIKE '%community%'                                                    THEN  68
      WHEN LOWER(cm.subject) LIKE '%surgery%'                                                           THEN  54
      WHEN LOWER(cm.subject) LIKE '%obstetric%' OR LOWER(cm.subject) LIKE '%gynaecolog%'
        OR LOWER(cm.subject) LIKE '%gynecolog%' OR LOWER(cm.subject) LIKE '%ob%gy%'                     THEN  78
      WHEN LOWER(cm.subject) LIKE '%paediatric%' OR LOWER(cm.subject) LIKE '%pediatric%'               THEN  30
      WHEN LOWER(cm.subject) LIKE '%ophthalmolog%' OR LOWER(cm.subject) LIKE '%eye%'                   THEN  38
      WHEN LOWER(cm.subject) LIKE '%ent%' OR LOWER(cm.subject) LIKE '%otorhinolar%'                    THEN  34
      WHEN LOWER(cm.subject) LIKE '%dermatolog%' OR LOWER(cm.subject) LIKE '%skin%'                    THEN  20
      WHEN LOWER(cm.subject) LIKE '%orthopaedic%' OR LOWER(cm.subject) LIKE '%orthopedic%'             THEN  30
      WHEN LOWER(cm.subject) LIKE '%psychiatry%' OR LOWER(cm.subject) LIKE '%mental%'                  THEN  24
      WHEN LOWER(cm.subject) LIKE '%anaesth%'    OR LOWER(cm.subject) LIKE '%anesth%'                  THEN  20
      WHEN LOWER(cm.subject) LIKE '%radiol%'     OR LOWER(cm.subject) LIKE '%imaging%'                 THEN  30
    END AS sm_2024
  FROM   public.chapter_marks cm
  INNER  JOIN neet_chapter_counts c ON c.subject = cm.subject
  WHERE  cm.exam_name = 'NEET PG'
)
UPDATE public.chapter_marks cm
SET
  marks_2023 = GREATEST(1, ROUND(ns.sm_2023::numeric / NULLIF(ns.chapters_per_subject, 0))),
  marks_2024 = GREATEST(1, ROUND(ns.sm_2024::numeric / NULLIF(ns.chapters_per_subject, 0))),
  marks_2025 = GREATEST(1, ROUND(ns.sm_2024::numeric / NULLIF(ns.chapters_per_subject, 0)))
FROM neet_subject_marks ns
WHERE cm.exam_name    = 'NEET PG'
  AND cm.subject      = ns.subject
  AND cm.chapter      = ns.chapter
  AND ns.sm_2023 IS NOT NULL
  AND ns.sm_2024 IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Correct chapter_marks for INI-CET
--
-- Subject marks (questions × 4) used per year:
--   marks_2023 → July 2023 data (equal split applied to grouped subjects)
--   marks_2024 → same as marks_2023 (no reliable 2024 data)
--   marks_2025 → Nov 2025 midpoints × 4; residual 9 Qs spread across 7 absent subjects
--
-- July 2023 × 4: Anat=40,Phys=40,Biochem=40,Path=68,Pharm=56,Micro=56,PSM=64,FM=24,
--                Med=52,Derm=52,OBG=64,Paeds=40,Surg=32,ENT=28,Ortho=32,Anaes=28,
--                Ophthal=24,Rad=36,Psych=24  (total 800)
--
-- Nov 2025 midpoints × 4: Anat=64,Phys=76,Biochem=56,Path=84,Pharm=64,Micro=64,FM=84,
--                          Surg=24,Med=116,Paeds=24,OBG=84,PSM=24,
--                          Derm=8,Ortho=8,ENT=4,Ophthal=4,Psych=4,Anaes=4,Rad=4  (total 800)
-- ─────────────────────────────────────────────────────────────────────────────
WITH ini_chapter_counts AS (
  SELECT subject, COUNT(*) AS chapters_per_subject
  FROM   public.chapter_marks
  WHERE  exam_name = 'INI-CET'
  GROUP  BY subject
),
ini_subject_marks AS (
  SELECT
    cm.subject,
    cm.chapter,
    c.chapters_per_subject,
    -- marks_2023: July 2023 question counts × 4 (grouped subjects split equally)
    CASE
      WHEN LOWER(cm.subject) LIKE '%anatomy%'                                                           THEN  40
      WHEN LOWER(cm.subject) LIKE '%physiology%'                                                        THEN  40
      WHEN LOWER(cm.subject) LIKE '%biochemistry%'                                                      THEN  40
      WHEN LOWER(cm.subject) LIKE '%pathology%'                                                         THEN  68
      WHEN LOWER(cm.subject) LIKE '%pharmacology%'                                                      THEN  56
      WHEN LOWER(cm.subject) LIKE '%microbiology%'                                                      THEN  56
      WHEN LOWER(cm.subject) LIKE '%community%' OR LOWER(cm.subject) LIKE '%preventive%'
        OR LOWER(cm.subject) LIKE '%social%'                                                            THEN  64
      WHEN LOWER(cm.subject) LIKE '%forensic%'                                                          THEN  24
      WHEN LOWER(cm.subject) LIKE '%medicine%'
        AND LOWER(cm.subject) NOT LIKE '%forensic%'
        AND LOWER(cm.subject) NOT LIKE '%community%'                                                    THEN  52
      WHEN LOWER(cm.subject) LIKE '%dermatolog%' OR LOWER(cm.subject) LIKE '%skin%'                    THEN  52
      WHEN LOWER(cm.subject) LIKE '%obstetric%' OR LOWER(cm.subject) LIKE '%gynaecolog%'
        OR LOWER(cm.subject) LIKE '%gynecolog%' OR LOWER(cm.subject) LIKE '%ob%gy%'                     THEN  64
      WHEN LOWER(cm.subject) LIKE '%paediatric%' OR LOWER(cm.subject) LIKE '%pediatric%'               THEN  40
      WHEN LOWER(cm.subject) LIKE '%surgery%'                                                           THEN  32
      WHEN LOWER(cm.subject) LIKE '%ent%' OR LOWER(cm.subject) LIKE '%otorhinolar%'                    THEN  28
      WHEN LOWER(cm.subject) LIKE '%orthopaedic%' OR LOWER(cm.subject) LIKE '%orthopedic%'             THEN  32
      WHEN LOWER(cm.subject) LIKE '%anaesth%'    OR LOWER(cm.subject) LIKE '%anesth%'                  THEN  28
      WHEN LOWER(cm.subject) LIKE '%ophthalmolog%' OR LOWER(cm.subject) LIKE '%eye%'                   THEN  24
      WHEN LOWER(cm.subject) LIKE '%radiol%'     OR LOWER(cm.subject) LIKE '%imaging%'                 THEN  36
      WHEN LOWER(cm.subject) LIKE '%psychiatry%' OR LOWER(cm.subject) LIKE '%mental%'                  THEN  24
    END AS sm_2023,
    -- marks_2025: Nov 2025 midpoints × 4
    CASE
      WHEN LOWER(cm.subject) LIKE '%anatomy%'                                                           THEN  64
      WHEN LOWER(cm.subject) LIKE '%physiology%'                                                        THEN  76
      WHEN LOWER(cm.subject) LIKE '%biochemistry%'                                                      THEN  56
      WHEN LOWER(cm.subject) LIKE '%pathology%'                                                         THEN  84
      WHEN LOWER(cm.subject) LIKE '%pharmacology%'                                                      THEN  64
      WHEN LOWER(cm.subject) LIKE '%microbiology%'                                                      THEN  64
      WHEN LOWER(cm.subject) LIKE '%community%' OR LOWER(cm.subject) LIKE '%preventive%'
        OR LOWER(cm.subject) LIKE '%social%'                                                            THEN  24
      WHEN LOWER(cm.subject) LIKE '%forensic%'                                                          THEN  84
      WHEN LOWER(cm.subject) LIKE '%medicine%'
        AND LOWER(cm.subject) NOT LIKE '%forensic%'
        AND LOWER(cm.subject) NOT LIKE '%community%'                                                    THEN 116
      WHEN LOWER(cm.subject) LIKE '%dermatolog%' OR LOWER(cm.subject) LIKE '%skin%'                    THEN   8
      WHEN LOWER(cm.subject) LIKE '%obstetric%' OR LOWER(cm.subject) LIKE '%gynaecolog%'
        OR LOWER(cm.subject) LIKE '%gynecolog%' OR LOWER(cm.subject) LIKE '%ob%gy%'                     THEN  84
      WHEN LOWER(cm.subject) LIKE '%paediatric%' OR LOWER(cm.subject) LIKE '%pediatric%'               THEN  24
      WHEN LOWER(cm.subject) LIKE '%surgery%'                                                           THEN  24
      WHEN LOWER(cm.subject) LIKE '%ent%' OR LOWER(cm.subject) LIKE '%otorhinolar%'                    THEN   4
      WHEN LOWER(cm.subject) LIKE '%orthopaedic%' OR LOWER(cm.subject) LIKE '%orthopedic%'             THEN   8
      WHEN LOWER(cm.subject) LIKE '%anaesth%'    OR LOWER(cm.subject) LIKE '%anesth%'                  THEN   4
      WHEN LOWER(cm.subject) LIKE '%ophthalmolog%' OR LOWER(cm.subject) LIKE '%eye%'                   THEN   4
      WHEN LOWER(cm.subject) LIKE '%radiol%'     OR LOWER(cm.subject) LIKE '%imaging%'                 THEN   4
      WHEN LOWER(cm.subject) LIKE '%psychiatry%' OR LOWER(cm.subject) LIKE '%mental%'                  THEN   4
    END AS sm_2025
  FROM   public.chapter_marks cm
  INNER  JOIN ini_chapter_counts c ON c.subject = cm.subject
  WHERE  cm.exam_name = 'INI-CET'
)
UPDATE public.chapter_marks cm
SET
  marks_2023 = GREATEST(1, ROUND(is_.sm_2023::numeric / NULLIF(is_.chapters_per_subject, 0))),
  marks_2024 = GREATEST(1, ROUND(is_.sm_2023::numeric / NULLIF(is_.chapters_per_subject, 0))),
  marks_2025 = GREATEST(1, ROUND(is_.sm_2025::numeric / NULLIF(is_.chapters_per_subject, 0)))
FROM ini_subject_marks is_
WHERE cm.exam_name    = 'INI-CET'
  AND cm.subject      = is_.subject
  AND cm.chapter      = is_.chapter
  AND is_.sm_2023 IS NOT NULL
  AND is_.sm_2025 IS NOT NULL;
