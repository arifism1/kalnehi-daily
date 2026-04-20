-- Relative Effort Score Backfill
-- Purpose: assign chapter-level relative_effort_score to all rows in public.syllabus_master.
-- Scoring bands:
--   1.0 - 3.9 : very easy / quick
--   4.0 - 6.9 : medium effort
--   7.0 - 10.0: hard / time-consuming
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
      -- High conceptual load / generally hard.
      when lower(n.chapter) ~
        '(rotational|electrostatics|current electricity|electromagnetic|organic mechanism|coordination|thermodynamics|equilibrium|calculus|integration|differential equation|probability|modern history|ancient history|polity|governance|ethics|essay|audit|taxation|cost accounting|financial management|critical reasoning|reading comprehension)'
      then 1.2
      -- Medium-high complexity.
      when lower(n.chapter) ~
        '(algebra|trigonometry|mechanics|organic|inorganic|physical chemistry|magnetism|electrochemistry|constitutional|governance|economy|accounting|quantitative aptitude|data interpretation|logical reasoning)'
      then 0.6
      -- Usually faster/foundational.
      when lower(n.chapter) ~
        '(basic|introduction|fundamentals|overview|units and dimensions|sets|number system|ratio and proportion|vocabulary|grammar basics)'
      then -0.5
      else 0
    end as difficulty_bonus,
    case
      when lower(n.subject) ~
        '(physics|chemistry|mathematics|accountancy|economics|statistics|quantitative aptitude|logical reasoning)'
      then 0.3
      else 0
    end as subject_bonus
  from normalized n
),
final_scores as (
  select
    s.exam_name,
    s.subject,
    s.chapter,
    round(
      greatest(
        1.0,
        least(
          10.0,
          2.0
          + 4.2 * s.topic_norm
          + 2.6 * s.marks_norm
          + 1.2 * s.relative_percentile
          + s.difficulty_bonus
          + s.subject_bonus
        )
      )::numeric,
      1
    ) as relative_effort_score
  from scored s
)
update public.syllabus_master sm
set relative_effort_score = fs.relative_effort_score
from final_scores fs
where sm.exam_name = fs.exam_name
  and sm.subject = fs.subject
  and sm.chapter = fs.chapter;

-- Verification summary: score distribution by exam.
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
  count(*) filter (where score >= 7.0) as hard_chapters,
  count(*) filter (where score >= 4.0 and score < 7.0) as medium_chapters,
  count(*) filter (where score < 4.0) as easy_chapters
from chapter_scores
group by exam_name
order by exam_name;

-- Sample reasoning table (20 chapters) from the same scoring logic.
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
      then 1.2
      when lower(n.chapter) ~
        '(algebra|trigonometry|mechanics|organic|inorganic|physical chemistry|magnetism|electrochemistry|constitutional|governance|economy|accounting|quantitative aptitude|data interpretation|logical reasoning)'
      then 0.6
      when lower(n.chapter) ~
        '(basic|introduction|fundamentals|overview|units and dimensions|sets|number system|ratio and proportion|vocabulary|grammar basics)'
      then -0.5
      else 0
    end as difficulty_bonus,
    case
      when lower(n.subject) ~
        '(physics|chemistry|mathematics|accountancy|economics|statistics|quantitative aptitude|logical reasoning)'
      then 0.3
      else 0
    end as subject_bonus
  from normalized n
)
select
  exam_name,
  subject,
  chapter,
  microtopic_count,
  round(avg_marks, 2) as avg_marks,
  round(topic_norm::numeric, 3) as topic_norm,
  round(marks_norm::numeric, 3) as marks_norm,
  round(relative_percentile::numeric, 3) as relative_percentile,
  round(difficulty_bonus::numeric, 2) as difficulty_bonus,
  round(subject_bonus::numeric, 2) as subject_bonus,
  round(
    greatest(
      1.0,
      least(
        10.0,
        2.0
        + 4.2 * topic_norm
        + 2.6 * marks_norm
        + 1.2 * relative_percentile
        + difficulty_bonus
        + subject_bonus
      )
    )::numeric,
    1
  ) as relative_effort_score
from scored
order by exam_name, subject, relative_effort_score desc, chapter
limit 20;
