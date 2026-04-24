-- Idempotent: applies GRANT + comments only if xp/level columns exist.
-- Use when: (a) 20260629120000 ran before the GRANT was merged into it, or
-- (b) you need to re-apply after a failed/partial run. Safe if already applied.

do $xp_grant$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'xp'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'level'
  ) then
    execute 'grant update (xp, level) on public.user_profiles to authenticated';
    execute 'comment on column public.user_profiles.xp is ' || quote_literal(
      'Total XP; updated by app after xp_events insert (RLS + column grants).'
    );
    execute 'comment on column public.user_profiles.level is ' || quote_literal(
      'Derived level from XP; updated alongside xp.'
    );
  end if;
end
$xp_grant$;
