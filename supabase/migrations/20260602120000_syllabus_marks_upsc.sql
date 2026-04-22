-- Populate marks_2025/2024/2023 for UPSC CSE Mains and UPSC CSE Prelims.
--
-- Strategy: every microtopic in a (subject, chapter) pair gets the SAME value so that
-- chapterMarksPoolForYearRows detects "all weights equal" and uses that value ONCE per chapter
-- (it does NOT multiply by microtopic count). This means the chapter pool = marks_per_chapter,
-- and subject pool = sum(marks_per_chapter across chapters in the subject).
--
-- UPSC CSE Mains paper weights (fixed — no year variation):
--   Essay                    : 250 marks  (1 paper)
--   General Studies I–IV     : 250 marks each (4 papers)
--   Optional Paper I & II    : 250 marks each (2 papers)
--   Qualifying Paper (Lang.) : 300 marks  (Paper A / Indian Language)
--   Qualifying Paper (Eng.)  : 300 marks  (Paper B / English)
--   ─────────────────────────────────────────────────────
--   Merit total (ex-qual.)   : 1750
--   Full written total       : 2350
--
-- Marks are distributed evenly across chapters within each paper so that the
-- sum of chapter weights per paper ≈ paper marks (rounding may cause ±1 per chapter).
--
-- Note: COUNT(DISTINCT …) is not valid inside a window in PostgreSQL; we use
-- GROUP BY per subject, then join back.

-- ─────────────────────────────────────────────────────────────────────────────
-- UPSC CSE Mains — Essay (250 marks)
-- ─────────────────────────────────────────────────────────────────────────────
WITH essay_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapter_count
  FROM public.syllabus_master
  WHERE exam_name = 'UPSC CSE Mains'
    AND LOWER(subject) LIKE '%essay%'
  GROUP BY subject
),
essay_dist AS (
  SELECT
    sm.subject,
    sm.chapter,
    GREATEST(1, ROUND(250.0 / NULLIF(ec.chapter_count, 0))::int) AS marks_per_chapter
  FROM public.syllabus_master sm
  INNER JOIN essay_counts ec ON ec.subject = sm.subject
  WHERE sm.exam_name = 'UPSC CSE Mains'
    AND LOWER(sm.subject) LIKE '%essay%'
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = ed.marks_per_chapter,
  marks_2024 = ed.marks_per_chapter,
  marks_2023 = ed.marks_per_chapter
FROM essay_dist ed
WHERE sm.exam_name = 'UPSC CSE Mains'
  AND sm.subject = ed.subject
  AND sm.chapter = ed.chapter;

-- ─────────────────────────────────────────────────────────────────────────────
-- UPSC CSE Mains — General Studies I, II, III, IV (250 marks each paper)
-- Each GS paper is its own distinct subject; chapters within each paper share
-- the paper's 250 marks evenly.
-- ─────────────────────────────────────────────────────────────────────────────
WITH gs_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapter_count
  FROM public.syllabus_master
  WHERE exam_name = 'UPSC CSE Mains'
    AND LOWER(subject) LIKE '%general studies%'
  GROUP BY subject
),
gs_dist AS (
  SELECT
    sm.subject,
    sm.chapter,
    GREATEST(1, ROUND(250.0 / NULLIF(gc.chapter_count, 0))::int) AS marks_per_chapter
  FROM public.syllabus_master sm
  INNER JOIN gs_counts gc ON gc.subject = sm.subject
  WHERE sm.exam_name = 'UPSC CSE Mains'
    AND LOWER(sm.subject) LIKE '%general studies%'
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = gd.marks_per_chapter,
  marks_2024 = gd.marks_per_chapter,
  marks_2023 = gd.marks_per_chapter
FROM gs_dist gd
WHERE sm.exam_name = 'UPSC CSE Mains'
  AND sm.subject = gd.subject
  AND sm.chapter = gd.chapter;

-- ─────────────────────────────────────────────────────────────────────────────
-- UPSC CSE Mains — Optional Subject Papers I & II (250 marks each)
-- Optional subjects have "(Optional)" in their name. Each paper is its own
-- subject (e.g. "Anthropology (Optional) - Paper I").
-- ─────────────────────────────────────────────────────────────────────────────
WITH opt_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapter_count
  FROM public.syllabus_master
  WHERE exam_name = 'UPSC CSE Mains'
    AND subject ILIKE '%(Optional)%'
  GROUP BY subject
),
opt_dist AS (
  SELECT
    sm.subject,
    sm.chapter,
    GREATEST(1, ROUND(250.0 / NULLIF(oc.chapter_count, 0))::int) AS marks_per_chapter
  FROM public.syllabus_master sm
  INNER JOIN opt_counts oc ON oc.subject = sm.subject
  WHERE sm.exam_name = 'UPSC CSE Mains'
    AND sm.subject ILIKE '%(Optional)%'
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = od.marks_per_chapter,
  marks_2024 = od.marks_per_chapter,
  marks_2023 = od.marks_per_chapter
FROM opt_dist od
WHERE sm.exam_name = 'UPSC CSE Mains'
  AND sm.subject = od.subject
  AND sm.chapter = od.chapter;

-- ─────────────────────────────────────────────────────────────────────────────
-- UPSC CSE Mains — Qualifying Papers (300 marks each)
-- Paper A = Indian Language, Paper B = English. Matched by subject name
-- patterns used in shouldKeepUpscMainsRow / isUpscMainsQualifyingPaperSubject.
-- ─────────────────────────────────────────────────────────────────────────────
WITH qual_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapter_count
  FROM public.syllabus_master
  WHERE exam_name = 'UPSC CSE Mains'
    AND (
      LOWER(subject) LIKE '%qualifying%'
      OR LOWER(subject) LIKE '%paper a%'
      OR LOWER(subject) LIKE '%paper b%'
      OR LOWER(subject) LIKE '%indian language%'
      OR (LOWER(subject) LIKE '%english%' AND LOWER(subject) NOT LIKE '%general studies%')
    )
    AND LOWER(subject) NOT LIKE '%essay%'
    AND LOWER(subject) NOT LIKE '%general studies%'
    AND subject NOT ILIKE '%(Optional)%'
  GROUP BY subject
),
qual_dist AS (
  SELECT
    sm.subject,
    sm.chapter,
    GREATEST(1, ROUND(300.0 / NULLIF(qc.chapter_count, 0))::int) AS marks_per_chapter
  FROM public.syllabus_master sm
  INNER JOIN qual_counts qc ON qc.subject = sm.subject
  WHERE sm.exam_name = 'UPSC CSE Mains'
    AND (
      LOWER(sm.subject) LIKE '%qualifying%'
      OR LOWER(sm.subject) LIKE '%paper a%'
      OR LOWER(sm.subject) LIKE '%paper b%'
      OR LOWER(sm.subject) LIKE '%indian language%'
      OR (LOWER(sm.subject) LIKE '%english%' AND LOWER(sm.subject) NOT LIKE '%general studies%')
    )
    AND LOWER(sm.subject) NOT LIKE '%essay%'
    AND LOWER(sm.subject) NOT LIKE '%general studies%'
    AND sm.subject NOT ILIKE '%(Optional)%'
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = qd.marks_per_chapter,
  marks_2024 = qd.marks_per_chapter,
  marks_2023 = qd.marks_per_chapter
FROM qual_dist qd
WHERE sm.exam_name = 'UPSC CSE Mains'
  AND sm.subject = qd.subject
  AND sm.chapter = qd.chapter;

-- ─────────────────────────────────────────────────────────────────────────────
-- UPSC CSE Prelims
-- Paper I: General Studies       — 200 marks (100 Q × 2 marks each)
-- Paper II: CSAT (Aptitude)      — 200 marks (80 Q × 2.5 marks, qualifying)
-- Distribute 200 marks evenly across chapters in each paper.
-- ─────────────────────────────────────────────────────────────────────────────
WITH prelims_counts AS (
  SELECT subject, COUNT(DISTINCT chapter) AS chapter_count
  FROM public.syllabus_master
  WHERE exam_name = 'UPSC CSE Prelims'
  GROUP BY subject
),
prelims_dist AS (
  SELECT
    sm.subject,
    sm.chapter,
    GREATEST(1, ROUND(200.0 / NULLIF(pc.chapter_count, 0))::int) AS marks_per_chapter
  FROM public.syllabus_master sm
  INNER JOIN prelims_counts pc ON pc.subject = sm.subject
  WHERE sm.exam_name = 'UPSC CSE Prelims'
)
UPDATE public.syllabus_master sm
SET
  marks_2025 = pd.marks_per_chapter,
  marks_2024 = pd.marks_per_chapter,
  marks_2023 = pd.marks_per_chapter
FROM prelims_dist pd
WHERE sm.exam_name = 'UPSC CSE Prelims'
  AND sm.subject = pd.subject
  AND sm.chapter = pd.chapter;
