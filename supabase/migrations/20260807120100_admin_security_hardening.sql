-- Admin security: audit log for destructive actions + bind admin user_ids from auth.

create table if not exists public.admin_action_audit_log (
  id              uuid primary key default gen_random_uuid(),
  admin_user_id   uuid not null references auth.users (id) on delete cascade,
  action          text not null,
  target_user_id  uuid references auth.users (id) on delete set null,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists admin_action_audit_log_created_idx
  on public.admin_action_audit_log (created_at desc);

create index if not exists admin_action_audit_log_admin_idx
  on public.admin_action_audit_log (admin_user_id, created_at desc);

alter table public.admin_action_audit_log enable row level security;

comment on table public.admin_action_audit_log is
  'Immutable audit trail for privileged admin actions (account deletion, erasure fulfillment).';

-- Pre-bind admin user_ids from existing auth accounts (no email-only claim at runtime).
update public.admin_users au
set
  user_id = u.id,
  user_id_claimed_at = coalesce(au.user_id_claimed_at, now()),
  updated_at = now()
from auth.users u
where au.email is not null
  and lower(au.email) = lower(u.email)
  and au.user_id is distinct from u.id;
