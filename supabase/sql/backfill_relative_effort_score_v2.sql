-- Relative Effort Score Backfill (V2 Calibrated)
-- Goals:
-- 1) Better spread across 1.0..10.0 with fewer chapters at the max
-- 2) Preserve relative ordering within each (exam_name, subject)
-- 3) Slightly lower effective ceiling for extremely hard chapters
-- 4) Keep intelligent inputs: microtopic load + marks + conceptual difficulty
--
-- Grouped exams currently in syllabus_master:
-- EXAM: CA Final
-- EXAM: CA Foundation
-- EXAM: CA Intermediate
-- EXAM: CAT
-- EXAM: CBSE Class 12
-- EXAM: CLAT UG
-- EXAM: CUET
-- EXAM: GRE
-- EXAM: IBPS PO
-- EXAM: INI-CET
-- EXAM: IPMAT Indore
-- EXAM: IPMAT Rohtak
-- EXAM: JEE Advanced
-- EXAM: JEE Main 2025
-- EXAM: JIPMAT
-- EXAM: NEET PG
-- EXAM: NEET UG
-- EXAM: SAT
-- EXAM: SBI PO
-- EXAM: SSC CGL
-- EXAM: SSC CHSL
-- EXAM: UPSC CSE Mains
-- EXAM: UPSC CSE Prelims

with chapter_features as (
  select
    sm.exam_name,
    sm.subject,
    sm.chapter,
    count(*)::numeric as microtopic_count,
    avg(
      (
        coalesce(sm.marks_2023, 0)::numeric
        + coalesce(sm.marks_2024, 0)::numeric
        + coalesce(sm.marks_2025, 0)::numeric
      )
      / nullif(
          (case when sm.marks_2023 is not null then 1 else 0 end)
        + (case when sm.marks_2024 is not null then 1 else 0 end)
        + (case when sm.marks_2025 is not null then 1 else 0 end),
        0
      )
    ) as avg_marks
  from public.syllabus_master sm
  group by sm.exam_name, sm.subject, sm.chapter
),
subject_stats as (
  select
    cf.exam_name,
    cf.subject,
    cf.chapter,
    cf.microtopic_count,
    coalesce(cf.avg_marks, 0)::numeric as avg_marks,
    min(cf.microtopic_count) over (
      partition by cf.exam_name, cf.subject
    ) as min_topic_count,
    max(cf.microtopic_count) over (
      partition by cf.exam_name, cf.subject
    ) as max_topic_count,
    min(coalesce(cf.avg_marks, 0)) over (
      partition by cf.exam_name, cf.subject
    ) as min_avg_marks,
    max(coalesce(cf.avg_marks, 0)) over (
      partition by cf.exam_name, cf.subject
    ) as max_avg_marks
  from chapter_features cf
),
normalized as (
  select
    ss.exam_name,
    ss.subject,
    ss.chapter,
    ss.microtopic_count,
    ss.avg_marks,
    case
      when ss.max_topic_count > ss.min_topic_count then
        (ss.microtopic_count - ss.min_topic_count)
        / nullif(ss.max_topic_count - ss.min_topic_count, 0)
      else 0.5
    end as topic_norm,
    case
      when ss.max_avg_marks > ss.min_avg_marks then
        (ss.avg_marks - ss.min_avg_marks)
        / nullif(ss.max_avg_marks - ss.min_avg_marks, 0)
      else 0.5
    end as marks_norm
  from subject_stats ss
),
scored as (
  select
    n.exam_name,
    n.subject,
    n.chapter,
    n.microtopic_count,
    n.avg_marks,
    n.topic_norm,
    n.marks_norm,
    percent_rank() over (
      partition by n.exam_name, n.subject
      order by (0.55 * n.topic_norm + 0.45 * n.marks_norm)
    ) as relative_percentile,
    case
      when lower(n.chapter) ~
        '(rotational|electrostatics|current electricity|electromagnetic|organic mechanism|coordination|thermodynamics|equilibrium|calculus|integration|differential equation|probability|modern history|ancient history|polity|governance|ethics|essay|audit|taxation|cost accounting|financial management|critical reasoning|reading comprehension)'
      then 1.00
      when lower(n.chapter) ~
        '(algebra|trigonometry|mechanics|organic|inorganic|physical chemistry|magnetism|electrochemistry|constitutional|governance|economy|accounting|quantitative aptitude|data interpretation|logical reasoning)'
      then 0.50
      when lower(n.chapter) ~
        '(basic|introduction|fundamentals|overview|units and dimensions|sets|number system|ratio and proportion|vocabulary|grammar basics)'
      then -0.40
      else 0
    end as difficulty_bonus,
    case
      when lower(n.subject) ~
        '(physics|chemistry|mathematics|accountancy|economics|statistics|quantitative aptitude|logical reasoning)'
      then 0.20
      else 0
    end as subject_bonus
  from normalized n
),
composite as (
  select
    s.exam_name,
    s.subject,
    s.chapter,
    s.microtopic_count,
    s.avg_marks,
    s.topic_norm,
    s.marks_norm,
    s.relative_percentile,
    s.difficulty_bonus,
    s.subject_bonus,
    least(
      10.0,
      greatest(
        1.0,
        1.8
        + 3.5 * s.topic_norm
        + 2.3 * s.marks_norm
        + 0.7 * s.relative_percentile
        + s.difficulty_bonus
        + s.subject_bonus
      )
    ) as raw_score
  from scored s
),
final_scores as (
  select
    c.exam_name,
    c.subject,
    c.chapter,
    round(
      least(
        9.6,
        greatest(
          1.0,
          1.0 + 8.6 * power((c.raw_score - 1.0) / 9.0, 1.22)
        )
      )::numeric,
      1
    ) as relative_effort_score
  from composite c
)
update public.syllabus_master sm
set relative_effort_score = fs.relative_effort_score
from final_scores fs
where sm.exam_name = fs.exam_name
  and sm.subject = fs.subject
  and sm.chapter = fs.chapter;

-- Verification summary: score spread by exam.
with chapter_scores as (
  select exam_name, subject, chapter, max(relative_effort_score) as score
  from public.syllabus_master
  group by exam_name, subject, chapter
)
select
  exam_name,
  count(*) as chapter_count,
  min(score) as min_score,
  round(avg(score)::numeric, 2) as avg_score,
  max(score) as max_score,
  count(*) filter (where score >= 9.5) as near_ceiling_chapters,
  count(*) filter (where score >= 7.0 and score < 9.5) as hard_chapters,
  count(*) filter (where score >= 4.0 and score < 7.0) as medium_chapters,
  count(*) filter (where score < 4.0) as easy_chapters
from chapter_scores
group by exam_name
order by exam_name;

-- Fresh 20-row sample with feature reasoning (v2 formula).
with chapter_features as (
  select
    sm.exam_name,
    sm.subject,
    sm.chapter,
    count(*)::numeric as microtopic_count,
    avg(
      (
        coalesce(sm.marks_2023, 0)::numeric
        + coalesce(sm.marks_2024, 0)::numeric
        + coalesce(sm.marks_2025, 0)::numeric
      )
      / nullif(
          (case when sm.marks_2023 is not null then 1 else 0 end)
        + (case when sm.marks_2024 is not null then 1 else 0 end)
        + (case when sm.marks_2025 is not null then 1 else 0 end),
        0
      )
    ) as avg_marks
  from public.syllabus_master sm
  group by sm.exam_name, sm.subject, sm.chapter
),
subject_stats as (
  select
    cf.exam_name,
    cf.subject,
    cf.chapter,
    cf.microtopic_count,
    coalesce(cf.avg_marks, 0)::numeric as avg_marks,
    min(cf.microtopic_count) over (
      partition by cf.exam_name, cf.subject
    ) as min_topic_count,
    max(cf.microtopic_count) over (
      partition by cf.exam_name, cf.subject
    ) as max_topic_count,
    min(coalesce(cf.avg_marks, 0)) over (
      partition by cf.exam_name, cf.subject
    ) as min_avg_marks,
    max(coalesce(cf.avg_marks, 0)) over (
      partition by cf.exam_name, cf.subject
    ) as max_avg_marks
  from chapter_features cf
),
normalized as (
  select
    ss.exam_name,
    ss.subject,
    ss.chapter,
    ss.microtopic_count,
    ss.avg_marks,
    case
      when ss.max_topic_count > ss.min_topic_count then
        (ss.microtopic_count - ss.min_topic_count)
        / nullif(ss.max_topic_count - ss.min_topic_count, 0)
      else 0.5
    end as topic_norm,
    case
      when ss.max_avg_marks > ss.min_avg_marks then
        (ss.avg_marks - ss.min_avg_marks)
        / nullif(ss.max_avg_marks - ss.min_avg_marks, 0)
      else 0.5
    end as marks_norm
  from subject_stats ss
),
scored as (
  select
    n.exam_name,
    n.subject,
    n.chapter,
    n.microtopic_count,
    n.avg_marks,
    n.topic_norm,
    n.marks_norm,
    percent_rank() over (
      partition by n.exam_name, n.subject
      order by (0.55 * n.topic_norm + 0.45 * n.marks_norm)
    ) as relative_percentile,
    case
      when lower(n.chapter) ~
        '(rotational|electrostatics|current electricity|electromagnetic|organic mechanism|coordination|thermodynamics|equilibrium|calculus|integration|differential equation|probability|modern history|ancient history|polity|governance|ethics|essay|audit|taxation|cost accounting|financial management|critical reasoning|reading comprehension)'
      then 1.00
      when lower(n.chapter) ~
        '(algebra|trigonometry|mechanics|organic|inorganic|physical chemistry|magnetism|electrochemistry|constitutional|governance|economy|accounting|quantitative aptitude|data interpretation|logical reasoning)'
      then 0.50
      when lower(n.chapter) ~
        '(basic|introduction|fundamentals|overview|units and dimensions|sets|number system|ratio and proportion|vocabulary|grammar basics)'
      then -0.40
      else 0
    end as difficulty_bonus,
    case
      when lower(n.subject) ~
        '(physics|chemistry|mathematics|accountancy|economics|statistics|quantitative aptitude|logical reasoning)'
      then 0.20
      else 0
    end as subject_bonus
  from normalized n
),
composite as (
  select
    s.*,
    least(
      10.0,
      greatest(
        1.0,
        1.8
        + 3.5 * s.topic_norm
        + 2.3 * s.marks_norm
        + 0.7 * s.relative_percentile
        + s.difficulty_bonus
        + s.subject_bonus
      )
    ) as raw_score
  from scored s
)
select
  c.exam_name,
  c.subject,
  c.chapter,
  c.microtopic_count,
  round(c.avg_marks, 2) as avg_marks,
  round(c.topic_norm::numeric, 3) as topic_norm,
  round(c.marks_norm::numeric, 3) as marks_norm,
  round(c.relative_percentile::numeric, 3) as relative_percentile,
  round(c.difficulty_bonus::numeric, 2) as difficulty_bonus,
  round(c.subject_bonus::numeric, 2) as subject_bonus,
  round(c.raw_score::numeric, 2) as raw_score,
  round(
    least(
      9.6,
      greatest(
        1.0,
        1.0 + 8.6 * power((c.raw_score - 1.0) / 9.0, 1.22)
      )
    )::numeric,
    1
  ) as relative_effort_score_v2
from composite c
order by relative_effort_score_v2 desc, c.exam_name, c.subject, c.chapter
limit 20;
