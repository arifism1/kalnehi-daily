-- Populate marks_2025/2024/2023 for all Tier-2 exams that have syllabus rows
-- but no per-year chapter weights yet.
--
-- Strategy (same as UPSC migration): every microtopic in a (subject, chapter)
-- pair gets the SAME value so chapterMarksPoolForYearRows deduplicates to one
-- weight per chapter. Subject pool ≈ intended subject marks.
--
-- For exams with a fixed mark scheme (CA, CLAT, SSC, Banking, SAT, GRE) we seed
-- marks_2025 = marks_2024 = marks_2023 so all three projection years show
-- the same score — communicating a stable pattern, not year variation.
--
-- For exams with actual year variation (JEE Advanced) we seed marks_2025 = marks_2024
-- = marks_2023 as equal-year approximation (can be refined with precise year data
-- in a later migration if needed).
--
-- Note: PostgreSQL does not support COUNT(DISTINCT x) in window functions; we use
-- GROUP BY per subject, then join back, plus scalar counts for total_subjects.
--
-- Exams covered:
--   Medical       : NEET PG, INI-CET
--   Engineering   : JEE Advanced
--   CA            : CA Foundation, CA Intermediate, CA Final
--   Law/Mgmt      : CLAT UG, CAT
--   Entrance      : IPMAT Indore, IPMAT Rohtak, JIPMAT
--   SSC/Banking   : SSC CGL, SSC CHSL, IBPS PO, SBI PO
--   International : SAT, GRE
--
-- NDA, GATE, GMAT are intentionally excluded — they have no syllabus_master rows.

-- ─── NEET PG (800 marks) ────────────────────────────────────────────────────
WITH neet_pg_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'NEET PG'
  GROUP BY subject
),
neet_pg_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%anatomy%'                                  THEN 60
      WHEN LOWER(s.subject) LIKE '%physiology%'                               THEN 40
      WHEN LOWER(s.subject) LIKE '%biochemistry%'                             THEN 32
      WHEN LOWER(s.subject) LIKE '%pathology%'                                THEN 80
      WHEN LOWER(s.subject) LIKE '%microbiology%'                             THEN 40
      WHEN LOWER(s.subject) LIKE '%pharmacology%'                             THEN 60
      WHEN LOWER(s.subject) LIKE '%forensic%'                                 THEN 20
      WHEN LOWER(s.subject) LIKE '%community%' OR LOWER(s.subject) LIKE '%preventive%' OR LOWER(s.subject) LIKE '%social%' THEN 32
      WHEN LOWER(s.subject) LIKE '%medicine%' AND LOWER(s.subject) NOT LIKE '%forensic%' AND LOWER(s.subject) NOT LIKE '%community%' THEN 100
      WHEN LOWER(s.subject) LIKE '%surgery%'                                  THEN 80
      WHEN LOWER(s.subject) LIKE '%obstetric%' OR LOWER(s.subject) LIKE '%gynaecolog%' OR LOWER(s.subject) LIKE '%gynecolog%' OR LOWER(s.subject) LIKE '%ob%gy%' THEN 60
      WHEN LOWER(s.subject) LIKE '%paediatric%' OR LOWER(s.subject) LIKE '%pediatric%' THEN 40
      WHEN LOWER(s.subject) LIKE '%ophthalmolog%' OR LOWER(s.subject) LIKE '%eye%'     THEN 28
      WHEN LOWER(s.subject) LIKE '%ent%' OR LOWER(s.subject) LIKE '%otorhinolar%'      THEN 28
      WHEN LOWER(s.subject) LIKE '%dermatolog%' OR LOWER(s.subject) LIKE '%skin%'      THEN 20
      WHEN LOWER(s.subject) LIKE '%orthopaedic%' OR LOWER(s.subject) LIKE '%orthopedic%' THEN 32
      WHEN LOWER(s.subject) LIKE '%psychiatry%' OR LOWER(s.subject) LIKE '%mental%'    THEN 20
      WHEN LOWER(s.subject) LIKE '%anaesth%' OR LOWER(s.subject) LIKE '%anesth%'       THEN 20
      WHEN LOWER(s.subject) LIKE '%radiol%' OR LOWER(s.subject) LIKE '%imaging%'       THEN 8
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'NEET PG'
),
neet_pg_known AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject
  FROM neet_pg_with_marks w
  INNER JOIN neet_pg_chapter_counts c ON c.subject = w.subject
),
neet_pg_unmatched_total AS (
  SELECT
    (SELECT COALESCE(SUM(agg.marks::numeric), 0)
     FROM (
       SELECT subject, MAX(subject_marks) AS marks
       FROM neet_pg_known
       GROUP BY subject
     ) agg
     WHERE agg.marks IS NOT NULL
    ) AS matched_marks,
    (SELECT COALESCE(COUNT(*)::int, 0)
     FROM (
       SELECT subject
       FROM neet_pg_known
       GROUP BY subject
       HAVING MAX(subject_marks) IS NULL
     ) u
    ) AS unmatched_subjects
),
neet_pg_final AS (
  SELECT
    k.subject,
    k.chapter,
    GREATEST(1, ROUND(
      COALESCE(
        k.subject_marks::numeric,
        GREATEST(1, (800 - ut.matched_marks) / NULLIF(ut.unmatched_subjects, 0))
      ) / NULLIF(k.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM neet_pg_known k
  CROSS JOIN neet_pg_unmatched_total ut
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = nf.marks_per_chapter,
  marks_2024 = nf.marks_per_chapter,
  marks_2023 = nf.marks_per_chapter
FROM neet_pg_final nf
WHERE sm.exam_name = 'NEET PG'
  AND sm.subject = nf.subject
  AND sm.chapter = nf.chapter;

-- ─── INI-CET (800 marks) ────────────────────────────────────────────────────
WITH ini_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'INI-CET'
  GROUP BY subject
),
ini_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%anatomy%'                                  THEN 60
      WHEN LOWER(s.subject) LIKE '%physiology%'                               THEN 40
      WHEN LOWER(s.subject) LIKE '%biochemistry%'                             THEN 32
      WHEN LOWER(s.subject) LIKE '%pathology%'                                THEN 80
      WHEN LOWER(s.subject) LIKE '%microbiology%'                             THEN 40
      WHEN LOWER(s.subject) LIKE '%pharmacology%'                             THEN 60
      WHEN LOWER(s.subject) LIKE '%forensic%'                                 THEN 20
      WHEN LOWER(s.subject) LIKE '%community%' OR LOWER(s.subject) LIKE '%preventive%' OR LOWER(s.subject) LIKE '%social%' THEN 32
      WHEN LOWER(s.subject) LIKE '%medicine%' AND LOWER(s.subject) NOT LIKE '%forensic%' AND LOWER(s.subject) NOT LIKE '%community%' THEN 100
      WHEN LOWER(s.subject) LIKE '%surgery%'                                  THEN 80
      WHEN LOWER(s.subject) LIKE '%obstetric%' OR LOWER(s.subject) LIKE '%gynaecolog%' OR LOWER(s.subject) LIKE '%gynecolog%' THEN 60
      WHEN LOWER(s.subject) LIKE '%paediatric%' OR LOWER(s.subject) LIKE '%pediatric%' THEN 40
      WHEN LOWER(s.subject) LIKE '%ophthalmolog%' OR LOWER(s.subject) LIKE '%eye%'     THEN 28
      WHEN LOWER(s.subject) LIKE '%ent%' OR LOWER(s.subject) LIKE '%otorhinolar%'      THEN 28
      WHEN LOWER(s.subject) LIKE '%dermatolog%' OR LOWER(s.subject) LIKE '%skin%'      THEN 20
      WHEN LOWER(s.subject) LIKE '%orthopaedic%' OR LOWER(s.subject) LIKE '%orthopedic%' THEN 32
      WHEN LOWER(s.subject) LIKE '%psychiatry%' OR LOWER(s.subject) LIKE '%mental%'    THEN 20
      WHEN LOWER(s.subject) LIKE '%anaesth%' OR LOWER(s.subject) LIKE '%anesth%'       THEN 20
      WHEN LOWER(s.subject) LIKE '%radiol%' OR LOWER(s.subject) LIKE '%imaging%'       THEN 8
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'INI-CET'
),
ini_known AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject
  FROM ini_with_marks w
  INNER JOIN ini_chapter_counts c ON c.subject = w.subject
),
ini_unmatched_total AS (
  SELECT
    (SELECT COALESCE(SUM(agg.marks::numeric), 0)
     FROM (
       SELECT subject, MAX(subject_marks) AS marks
       FROM ini_known
       GROUP BY subject
     ) agg
     WHERE agg.marks IS NOT NULL
    ) AS matched_marks,
    (SELECT COALESCE(COUNT(*)::int, 0)
     FROM (
       SELECT subject
       FROM ini_known
       GROUP BY subject
       HAVING MAX(subject_marks) IS NULL
     ) u
    ) AS unmatched_subjects
),
ini_final AS (
  SELECT
    k.subject,
    k.chapter,
    GREATEST(1, ROUND(
      COALESCE(
        k.subject_marks::numeric,
        GREATEST(1, (800 - ut.matched_marks) / NULLIF(ut.unmatched_subjects, 0))
      ) / NULLIF(k.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM ini_known k
  CROSS JOIN ini_unmatched_total ut
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = inf.marks_per_chapter,
  marks_2024 = inf.marks_per_chapter,
  marks_2023 = inf.marks_per_chapter
FROM ini_final inf
WHERE sm.exam_name = 'INI-CET'
  AND sm.subject = inf.subject
  AND sm.chapter = inf.chapter;

-- ─── JEE Advanced (360 marks) ───────────────────────────────────────────────
WITH jee_adv_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapter_count
  FROM public.syllabus_master
  WHERE exam_name = 'JEE Advanced'
  GROUP BY subject
),
jee_adv_dist AS (
  SELECT
    sm.subject,
    sm.chapter,
    GREATEST(1, ROUND(120.0 / NULLIF(jc.chapter_count, 0))::int) AS marks_per_chapter
  FROM public.syllabus_master sm
  INNER JOIN jee_adv_counts jc ON jc.subject = sm.subject
  WHERE sm.exam_name = 'JEE Advanced'
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = jad.marks_per_chapter,
  marks_2024 = jad.marks_per_chapter,
  marks_2023 = jad.marks_per_chapter
FROM jee_adv_dist jad
WHERE sm.exam_name = 'JEE Advanced'
  AND sm.subject = jad.subject
  AND sm.chapter = jad.chapter;

-- ─── CA Foundation (400 marks — 4 papers × 100 each) ───────────────────────
WITH ca_fnd_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapter_count
  FROM public.syllabus_master
  WHERE exam_name = 'CA Foundation'
  GROUP BY subject
),
ca_fnd_dist AS (
  SELECT
    sm.subject,
    sm.chapter,
    GREATEST(1, ROUND(100.0 / NULLIF(cfc.chapter_count, 0))::int) AS marks_per_chapter
  FROM public.syllabus_master sm
  INNER JOIN ca_fnd_counts cfc ON cfc.subject = sm.subject
  WHERE sm.exam_name = 'CA Foundation'
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = cfd.marks_per_chapter,
  marks_2024 = cfd.marks_per_chapter,
  marks_2023 = cfd.marks_per_chapter
FROM ca_fnd_dist cfd
WHERE sm.exam_name = 'CA Foundation'
  AND sm.subject = cfd.subject
  AND sm.chapter = cfd.chapter;

-- ─── CA Intermediate (800 marks — 8 papers × 100 each) ─────────────────────
WITH ca_int_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapter_count
  FROM public.syllabus_master
  WHERE exam_name = 'CA Intermediate'
  GROUP BY subject
),
ca_int_dist AS (
  SELECT
    sm.subject,
    sm.chapter,
    GREATEST(1, ROUND(100.0 / NULLIF(cic.chapter_count, 0))::int) AS marks_per_chapter
  FROM public.syllabus_master sm
  INNER JOIN ca_int_counts cic ON cic.subject = sm.subject
  WHERE sm.exam_name = 'CA Intermediate'
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = cid.marks_per_chapter,
  marks_2024 = cid.marks_per_chapter,
  marks_2023 = cid.marks_per_chapter
FROM ca_int_dist cid
WHERE sm.exam_name = 'CA Intermediate'
  AND sm.subject = cid.subject
  AND sm.chapter = cid.chapter;

-- ─── CA Final (800 marks — 8 papers × 100 each) ─────────────────────────────
WITH ca_fin_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapter_count
  FROM public.syllabus_master
  WHERE exam_name = 'CA Final'
  GROUP BY subject
),
ca_fin_dist AS (
  SELECT
    sm.subject,
    sm.chapter,
    GREATEST(1, ROUND(100.0 / NULLIF(cfc.chapter_count, 0))::int) AS marks_per_chapter
  FROM public.syllabus_master sm
  INNER JOIN ca_fin_counts cfc ON cfc.subject = sm.subject
  WHERE sm.exam_name = 'CA Final'
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = cfd.marks_per_chapter,
  marks_2024 = cfd.marks_per_chapter,
  marks_2023 = cfd.marks_per_chapter
FROM ca_fin_dist cfd
WHERE sm.exam_name = 'CA Final'
  AND sm.subject = cfd.subject
  AND sm.chapter = cfd.chapter;

-- ─── CLAT UG (120 marks) ────────────────────────────────────────────────────
WITH clat_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'CLAT UG'
  GROUP BY subject
),
clat_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'CLAT UG'
),
clat_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%english%'                                   THEN 24
      WHEN LOWER(s.subject) LIKE '%current affairs%' OR LOWER(s.subject) LIKE '%general knowledge%' OR LOWER(s.subject) LIKE '%gk%' THEN 30
      WHEN LOWER(s.subject) LIKE '%legal%'                                     THEN 30
      WHEN LOWER(s.subject) LIKE '%logical%' OR LOWER(s.subject) LIKE '%reasoning%' THEN 24
      WHEN LOWER(s.subject) LIKE '%quantitative%' OR LOWER(s.subject) LIKE '%maths%' OR LOWER(s.subject) LIKE '%numeracy%' THEN 12
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'CLAT UG'
),
clat_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM clat_with_marks w
  INNER JOIN clat_chapter_counts c ON c.subject = w.subject
  CROSS JOIN clat_total_subjects t
),
clat_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 120.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM clat_joined j
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = cf.marks_per_chapter,
  marks_2024 = cf.marks_per_chapter,
  marks_2023 = cf.marks_per_chapter
FROM clat_final cf
WHERE sm.exam_name = 'CLAT UG'
  AND sm.subject = cf.subject
  AND sm.chapter = cf.chapter;

-- ─── CAT (198 marks) ────────────────────────────────────────────────────────
WITH cat_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'CAT'
  GROUP BY subject
),
cat_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'CAT'
),
cat_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%verbal%' OR LOWER(s.subject) LIKE '%reading%' OR LOWER(s.subject) LIKE '%varc%' THEN 78
      WHEN LOWER(s.subject) LIKE '%data interpretation%' OR LOWER(s.subject) LIKE '%logical reasoning%' OR LOWER(s.subject) LIKE '%dilr%' THEN 72
      WHEN LOWER(s.subject) LIKE '%quantitative%' OR LOWER(s.subject) LIKE '%qa%' THEN 48
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'CAT'
),
cat_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM cat_with_marks w
  INNER JOIN cat_chapter_counts c ON c.subject = w.subject
  CROSS JOIN cat_total_subjects t
),
cat_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 198.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM cat_joined j
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = cf.marks_per_chapter,
  marks_2024 = cf.marks_per_chapter,
  marks_2023 = cf.marks_per_chapter
FROM cat_final cf
WHERE sm.exam_name = 'CAT'
  AND sm.subject = cf.subject
  AND sm.chapter = cf.chapter;

-- ─── IPMAT Indore (300 marks) ────────────────────────────────────────────────
WITH iind_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'IPMAT Indore'
  GROUP BY subject
),
iind_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'IPMAT Indore'
),
iind_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%quantitative%' OR LOWER(s.subject) LIKE '%maths%' OR LOWER(s.subject) LIKE '%math%' THEN 150
      WHEN LOWER(s.subject) LIKE '%verbal%' OR LOWER(s.subject) LIKE '%english%' OR LOWER(s.subject) LIKE '%reading%'   THEN 150
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'IPMAT Indore'
),
iind_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM iind_with_marks w
  INNER JOIN iind_chapter_counts c ON c.subject = w.subject
  CROSS JOIN iind_total_subjects t
),
ipmat_indore_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 300.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM iind_joined j
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = iif.marks_per_chapter,
  marks_2024 = iif.marks_per_chapter,
  marks_2023 = iif.marks_per_chapter
FROM ipmat_indore_final iif
WHERE sm.exam_name = 'IPMAT Indore'
  AND sm.subject = iif.subject
  AND sm.chapter = iif.chapter;

-- ─── IPMAT Rohtak (300 marks) ────────────────────────────────────────────────
WITH iroh_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'IPMAT Rohtak'
  GROUP BY subject
),
iroh_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'IPMAT Rohtak'
),
iroh_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%quantitative%' OR LOWER(s.subject) LIKE '%maths%' OR LOWER(s.subject) LIKE '%math%' THEN 100
      WHEN LOWER(s.subject) LIKE '%verbal%' OR LOWER(s.subject) LIKE '%english%'  THEN 100
      WHEN LOWER(s.subject) LIKE '%logical%' OR LOWER(s.subject) LIKE '%reasoning%' THEN 100
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'IPMAT Rohtak'
),
iroh_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM iroh_with_marks w
  INNER JOIN iroh_chapter_counts c ON c.subject = w.subject
  CROSS JOIN iroh_total_subjects t
),
ipmat_rohtak_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 300.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM iroh_joined j
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = irf.marks_per_chapter,
  marks_2024 = irf.marks_per_chapter,
  marks_2023 = irf.marks_per_chapter
FROM ipmat_rohtak_final irf
WHERE sm.exam_name = 'IPMAT Rohtak'
  AND sm.subject = irf.subject
  AND sm.chapter = irf.chapter;

-- ─── JIPMAT (400 marks) ─────────────────────────────────────────────────────
WITH jip_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'JIPMAT'
  GROUP BY subject
),
jip_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'JIPMAT'
),
jip_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%quantitative%' OR LOWER(s.subject) LIKE '%maths%' OR LOWER(s.subject) LIKE '%math%' THEN 133
      WHEN LOWER(s.subject) LIKE '%data interpretation%' OR LOWER(s.subject) LIKE '%logical%' OR LOWER(s.subject) LIKE '%dilr%' THEN 133
      WHEN LOWER(s.subject) LIKE '%verbal%' OR LOWER(s.subject) LIKE '%english%' OR LOWER(s.subject) LIKE '%reading%' THEN 133
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'JIPMAT'
),
jip_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM jip_with_marks w
  INNER JOIN jip_chapter_counts c ON c.subject = w.subject
  CROSS JOIN jip_total_subjects t
),
jipmat_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 400.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM jip_joined j
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = jf.marks_per_chapter,
  marks_2024 = jf.marks_per_chapter,
  marks_2023 = jf.marks_per_chapter
FROM jipmat_final jf
WHERE sm.exam_name = 'JIPMAT'
  AND sm.subject = jf.subject
  AND sm.chapter = jf.chapter;

-- ─── SSC CGL (450 marks — Tier-II Paper-I CBT) ──────────────────────────────
WITH ssc_cgl_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'SSC CGL'
  GROUP BY subject
),
ssc_cgl_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'SSC CGL'
),
ssc_cgl_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%math%' OR LOWER(s.subject) LIKE '%quantitative%' OR LOWER(s.subject) LIKE '%numerical%' THEN 90
      WHEN LOWER(s.subject) LIKE '%reasoning%' OR LOWER(s.subject) LIKE '%general intelligence%' THEN 90
      WHEN LOWER(s.subject) LIKE '%english%'                                    THEN 45
      WHEN LOWER(s.subject) LIKE '%general awareness%' OR LOWER(s.subject) LIKE '%general knowledge%' OR LOWER(s.subject) LIKE '%gk%' OR LOWER(s.subject) LIKE '%gs%' THEN 25
      WHEN LOWER(s.subject) LIKE '%computer%'                                   THEN 20
      WHEN LOWER(s.subject) LIKE '%statistics%'                                 THEN 100
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'SSC CGL'
),
ssc_cgl_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM ssc_cgl_with_marks w
  INNER JOIN ssc_cgl_chapter_counts c ON c.subject = w.subject
  CROSS JOIN ssc_cgl_total_subjects t
),
ssc_cgl_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 450.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM ssc_cgl_joined j
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = scf.marks_per_chapter,
  marks_2024 = scf.marks_per_chapter,
  marks_2023 = scf.marks_per_chapter
FROM ssc_cgl_final scf
WHERE sm.exam_name = 'SSC CGL'
  AND sm.subject = scf.subject
  AND sm.chapter = scf.chapter;

-- ─── SSC CHSL (405 marks — Tier-II CBT) ─────────────────────────────────────
WITH ssc_chsl_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'SSC CHSL'
  GROUP BY subject
),
ssc_chsl_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'SSC CHSL'
),
ssc_chsl_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%math%' OR LOWER(s.subject) LIKE '%quantitative%' THEN 60
      WHEN LOWER(s.subject) LIKE '%reasoning%' OR LOWER(s.subject) LIKE '%general intelligence%' THEN 60
      WHEN LOWER(s.subject) LIKE '%english%'                                     THEN 120
      WHEN LOWER(s.subject) LIKE '%general awareness%' OR LOWER(s.subject) LIKE '%gk%' THEN 60
      WHEN LOWER(s.subject) LIKE '%computer%'                                    THEN 15
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'SSC CHSL'
),
ssc_chsl_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM ssc_chsl_with_marks w
  INNER JOIN ssc_chsl_chapter_counts c ON c.subject = w.subject
  CROSS JOIN ssc_chsl_total_subjects t
),
ssc_chsl_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 405.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM ssc_chsl_joined j
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = scf.marks_per_chapter,
  marks_2024 = scf.marks_per_chapter,
  marks_2023 = scf.marks_per_chapter
FROM ssc_chsl_final scf
WHERE sm.exam_name = 'SSC CHSL'
  AND sm.subject = scf.subject
  AND sm.chapter = scf.chapter;

-- ─── IBPS PO (225 marks — Mains) ────────────────────────────────────────────
WITH ibps_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'IBPS PO'
  GROUP BY subject
),
ibps_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'IBPS PO'
),
ibps_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%reasoning%'                                  THEN 60
      WHEN LOWER(s.subject) LIKE '%english%' AND LOWER(s.subject) NOT LIKE '%descriptive%' THEN 40
      WHEN LOWER(s.subject) LIKE '%quantitative%' OR LOWER(s.subject) LIKE '%numerical%' OR LOWER(s.subject) LIKE '%data%' THEN 50
      WHEN LOWER(s.subject) LIKE '%general awareness%' OR LOWER(s.subject) LIKE '%banking%' OR LOWER(s.subject) LIKE '%financial%' OR LOWER(s.subject) LIKE '%gk%' THEN 40
      WHEN LOWER(s.subject) LIKE '%computer%'                                   THEN 20
      WHEN LOWER(s.subject) LIKE '%descriptive%'                                THEN 25
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'IBPS PO'
),
ibps_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM ibps_with_marks w
  INNER JOIN ibps_chapter_counts c ON c.subject = w.subject
  CROSS JOIN ibps_total_subjects t
),
ibps_po_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 225.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM ibps_joined j
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = ipf.marks_per_chapter,
  marks_2024 = ipf.marks_per_chapter,
  marks_2023 = ipf.marks_per_chapter
FROM ibps_po_final ipf
WHERE sm.exam_name = 'IBPS PO'
  AND sm.subject = ipf.subject
  AND sm.chapter = ipf.chapter;

-- ─── SBI PO (250 marks — Mains) ─────────────────────────────────────────────
WITH sbi_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'SBI PO'
  GROUP BY subject
),
sbi_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'SBI PO'
),
sbi_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%reasoning%'                                  THEN 60
      WHEN LOWER(s.subject) LIKE '%computer%' AND LOWER(s.subject) NOT LIKE '%reasoning%' THEN 15
      WHEN LOWER(s.subject) LIKE '%data%' OR LOWER(s.subject) LIKE '%quantitative%' OR LOWER(s.subject) LIKE '%numerical%' THEN 50
      WHEN LOWER(s.subject) LIKE '%general awareness%' OR LOWER(s.subject) LIKE '%banking%' OR LOWER(s.subject) LIKE '%gk%' THEN 40
      WHEN LOWER(s.subject) LIKE '%english%' AND LOWER(s.subject) NOT LIKE '%descriptive%' THEN 35
      WHEN LOWER(s.subject) LIKE '%descriptive%'                                THEN 50
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'SBI PO'
),
sbi_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM sbi_with_marks w
  INNER JOIN sbi_chapter_counts c ON c.subject = w.subject
  CROSS JOIN sbi_total_subjects t
),
sbi_po_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 250.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM sbi_joined j
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = spf.marks_per_chapter,
  marks_2024 = spf.marks_per_chapter,
  marks_2023 = spf.marks_per_chapter
FROM sbi_po_final spf
WHERE sm.exam_name = 'SBI PO'
  AND sm.subject = spf.subject
  AND sm.chapter = spf.chapter;

-- ─── SAT (1600 marks) ────────────────────────────────────────────────────────
WITH sat_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'SAT'
  GROUP BY subject
),
sat_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'SAT'
),
sat_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%math%' OR LOWER(s.subject) LIKE '%quantitative%' THEN 800
      WHEN LOWER(s.subject) LIKE '%reading%' OR LOWER(s.subject) LIKE '%writing%' OR LOWER(s.subject) LIKE '%verbal%' OR LOWER(s.subject) LIKE '%evidence%' OR LOWER(s.subject) LIKE '%english%' THEN 800
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'SAT'
),
sat_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM sat_with_marks w
  INNER JOIN sat_chapter_counts c ON c.subject = w.subject
  CROSS JOIN sat_total_subjects t
),
sat_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 1600.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM sat_joined j
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = sf.marks_per_chapter,
  marks_2024 = sf.marks_per_chapter,
  marks_2023 = sf.marks_per_chapter
FROM sat_final sf
WHERE sm.exam_name = 'SAT'
  AND sm.subject = sf.subject
  AND sm.chapter = sf.chapter;

-- ─── GRE (340 marks) ─────────────────────────────────────────────────────────
WITH gre_chapter_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapters_per_subject
  FROM public.syllabus_master
  WHERE exam_name = 'GRE'
  GROUP BY subject
),
gre_total_subjects AS (
  SELECT COUNT(DISTINCT subject)::numeric AS total_subjects
  FROM public.syllabus_master
  WHERE exam_name = 'GRE'
),
gre_with_marks AS (
  SELECT
    s.subject,
    s.chapter,
    CASE
      WHEN LOWER(s.subject) LIKE '%verbal%' OR LOWER(s.subject) LIKE '%reading%' OR LOWER(s.subject) LIKE '%vocabulary%' THEN 170
      WHEN LOWER(s.subject) LIKE '%quantitative%' OR LOWER(s.subject) LIKE '%math%' OR LOWER(s.subject) LIKE '%numerical%' THEN 170
      WHEN LOWER(s.subject) LIKE '%analytical%' OR LOWER(s.subject) LIKE '%writing%' OR LOWER(s.subject) LIKE '%awa%' THEN 0
      ELSE NULL
    END AS subject_marks
  FROM public.syllabus_master s
  WHERE s.exam_name = 'GRE'
),
gre_joined AS (
  SELECT
    w.subject,
    w.chapter,
    w.subject_marks,
    c.chapters_per_subject,
    t.total_subjects
  FROM gre_with_marks w
  INNER JOIN gre_chapter_counts c ON c.subject = w.subject
  CROSS JOIN gre_total_subjects t
),
gre_final AS (
  SELECT
    j.subject,
    j.chapter,
    GREATEST(1, ROUND(
      COALESCE(j.subject_marks::numeric, 340.0 / NULLIF(j.total_subjects, 0))
      / NULLIF(j.chapters_per_subject::numeric, 0)
    )::int) AS marks_per_chapter
  FROM gre_joined j
  WHERE j.subject_marks IS NULL OR j.subject_marks > 0
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = gf.marks_per_chapter,
  marks_2024 = gf.marks_per_chapter,
  marks_2023 = gf.marks_per_chapter
FROM gre_final gf
WHERE sm.exam_name = 'GRE'
  AND sm.subject = gf.subject
  AND sm.chapter = gf.chapter;
