-- Anonymous weekly cohort leaderboard: one row per user per IST calendar week.
-- composite defines ordering (higher = better). top_percent: "top X%" in UI means
-- ceil(100 * rank / cohort_size) with rank=1 = best, ties get same rank (Postgres rank()).

create table if not exists public.leaderboard_weekly_metrics (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  cohort_key text not null,
  weekly_seconds bigint not null default 0,
  syllabus_overall_pct numeric not null default 0,
  composite numeric not null default 0,
  top_percent int,
  cohort_size int,
  cohort_rank int,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create index if not exists leaderboard_weekly_metrics_cohort_week_idx
  on public.leaderboard_weekly_metrics (cohort_key, week_start);

comment on table public.leaderboard_weekly_metrics is
  'Cohort stats for anonymous leaderboard; no client read — server/service role only.';
comment on column public.leaderboard_weekly_metrics.top_percent is
  'Narrow band for copy, e.g. "top 23%": ceil(100*rank/cohort_size), rank=1 best; null if cohort < 20.';

alter table public.leaderboard_weekly_metrics enable row level security;

-- Recompute top_percent, cohort_size, cohort_rank for all rows in a week (one IST Monday).
-- Minimum cohort N=20: below that top_percent is null (callers show "not enough data").
create or replace function public.recompute_leaderboard_weekly_top_percents (p_week_start date)
returns void
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      user_id,
      week_start,
      cohort_key,
      count(*) over (partition by cohort_key, week_start) as cnt,
      rank() over (
        partition by cohort_key, week_start
        order by composite desc nulls last
      ) as rnk
    from public.leaderboard_weekly_metrics
    where week_start = p_week_start
  )
  update public.leaderboard_weekly_metrics m
  set
    cohort_size = r.cnt,
    cohort_rank = r.rnk::int,
    top_percent = case
      when r.cnt < 20 then null
      else greatest(
        1,
        least(100, ceil(100.0 * r.rnk / r.cnt::double precision))::int
      )
    end
  from ranked r
  where m.user_id = r.user_id
    and m.week_start = r.week_start
    and m.cohort_key = r.cohort_key
    and m.week_start = p_week_start;
$$;

revoke all on function public.recompute_leaderboard_weekly_top_percents (date) from public;
grant execute on function public.recompute_leaderboard_weekly_top_percents (date) to service_role;
