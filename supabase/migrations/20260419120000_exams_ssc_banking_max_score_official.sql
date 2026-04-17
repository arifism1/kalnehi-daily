-- Correct max_score for SSC/banking exams if an older revision of 20260418150000 was already applied.
-- Values and rationale must match src/lib/examsCatalog.ts (EXAMS_CATALOG_FALLBACK) and src/lib/examProfile.ts (examScoreMax).

UPDATE public.exams
SET max_score = v.max_score
FROM (
  VALUES
    ('SSC CHSL', 405), -- Tier-II CBT scored sections (405); Tier-I qualifying; skill/typing not scored toward this cap
    ('SSC CGL', 450),  -- Tier-II Paper-I compulsory (450); Tier-I qualifying for standard merit list
    ('IBPS PO', 225),  -- CWE Mains 200 objective + 25 descriptive
    ('SBI PO', 250)    -- Phase-II Mains 200 objective + 50 descriptive
) AS v(exam_name, max_score)
WHERE public.exams.exam_name = v.exam_name;
