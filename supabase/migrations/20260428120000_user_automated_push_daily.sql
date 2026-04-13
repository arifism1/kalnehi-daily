-- Daily cap for automated product pushes per user (IST calendar date). Used by cron + danger-zone.
create table if not exists public.user_automated_push_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  ist_date text not null,
  send_count int not null default 0
    check (send_count >= 0 and send_count <= 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, ist_date)
);

create index if not exists user_automated_push_daily_ist_idx
  on public.user_automated_push_daily (ist_date desc);

alter table public.user_automated_push_daily enable row level security;

-- Service role only (no policies for authenticated users).

create or replace function public.try_consume_automated_push_budget(
  p_user_id uuid,
  p_ist_date text,
  p_max int default 5
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.user_automated_push_daily (user_id, ist_date, send_count)
  values (p_user_id, p_ist_date, 1)
  on conflict (user_id, ist_date) do update
    set send_count = public.user_automated_push_daily.send_count + 1,
        updated_at = now()
    where public.user_automated_push_daily.send_count < p_max
  returning send_count into v_count;

  if v_count is null then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.refund_automated_push_budget(
  p_user_id uuid,
  p_ist_date text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_automated_push_daily
  set send_count = greatest(0, send_count - 1),
      updated_at = now()
  where user_id = p_user_id
    and ist_date = p_ist_date
    and send_count > 0;
end;
$$;

revoke all on function public.try_consume_automated_push_budget(uuid, text, int) from public;
revoke all on function public.refund_automated_push_budget(uuid, text) from public;
grant execute on function public.try_consume_automated_push_budget(uuid, text, int) to service_role;
grant execute on function public.refund_automated_push_budget(uuid, text) to service_role;

comment on table public.user_automated_push_daily is
  'Counts automated Kalnehi pushes (system + custom cron + danger) per user per IST day; cap enforced in application via RPC.';
