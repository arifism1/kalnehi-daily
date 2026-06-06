-- DPDP Act compliance tables: consent records, rights requests, breach incidents.

-- ─── Consent records ────────────────────────────────────────────────────────

create table if not exists public.dpdp_consent_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  purpose_version text not null,
  given_at        timestamptz not null default now(),
  withdrawn_at    timestamptz,
  ip_hash         text,
  method          text not null check (method in ('email_otp', 'google_oauth')),
  raw_purposes    jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists dpdp_consent_records_user_given_idx
  on public.dpdp_consent_records (user_id, given_at desc);

create unique index if not exists dpdp_consent_records_active_user_idx
  on public.dpdp_consent_records (user_id)
  where withdrawn_at is null;

alter table public.dpdp_consent_records enable row level security;

drop policy if exists "dpdp_consent_records_select_own" on public.dpdp_consent_records;
create policy "dpdp_consent_records_select_own"
  on public.dpdp_consent_records for select
  using (auth.uid() = user_id);

drop policy if exists "dpdp_consent_records_insert_own" on public.dpdp_consent_records;
create policy "dpdp_consent_records_insert_own"
  on public.dpdp_consent_records for insert
  with check (auth.uid() = user_id);

drop policy if exists "dpdp_consent_records_update_own" on public.dpdp_consent_records;
create policy "dpdp_consent_records_update_own"
  on public.dpdp_consent_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.dpdp_consent_records is
  'Server-side DPDP consent audit trail per user signup / re-consent.';

-- ─── Rights requests ────────────────────────────────────────────────────────

create type public.dpdp_rights_request_type as enum (
  'access',
  'correction',
  'erasure',
  'nomination'
);

create type public.dpdp_rights_request_status as enum (
  'pending',
  'in_progress',
  'resolved',
  'rejected'
);

create table if not exists public.dpdp_rights_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  reference_id     text not null unique,
  type             public.dpdp_rights_request_type not null,
  status           public.dpdp_rights_request_status not null default 'pending',
  due_at           timestamptz not null,
  resolved_at      timestamptz,
  notes            text,
  export_url       text,
  request_details  jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists dpdp_rights_requests_user_created_idx
  on public.dpdp_rights_requests (user_id, created_at desc);

create index if not exists dpdp_rights_requests_status_due_idx
  on public.dpdp_rights_requests (status, due_at);

alter table public.dpdp_rights_requests enable row level security;

drop policy if exists "dpdp_rights_requests_select_own" on public.dpdp_rights_requests;
create policy "dpdp_rights_requests_select_own"
  on public.dpdp_rights_requests for select
  using (auth.uid() = user_id);

drop policy if exists "dpdp_rights_requests_insert_own" on public.dpdp_rights_requests;
create policy "dpdp_rights_requests_insert_own"
  on public.dpdp_rights_requests for insert
  with check (auth.uid() = user_id);

comment on table public.dpdp_rights_requests is
  'Data Principal rights requests under DPDP (access, correction, erasure, nomination).';

-- ─── Breach incidents (admin / service role only) ───────────────────────────

create type public.dpdp_breach_incident_status as enum (
  'draft',
  'board_notified',
  'principals_notified',
  'closed'
);

create table if not exists public.dpdp_breach_incidents (
  id                      uuid primary key default gen_random_uuid(),
  reported_at             timestamptz not null default now(),
  affected_count          integer not null default 0 check (affected_count >= 0),
  description             text not null,
  board_notified_at       timestamptz,
  principal_notified_at   timestamptz,
  status                  public.dpdp_breach_incident_status not null default 'draft',
  created_by              uuid references auth.users (id) on delete set null,
  affected_user_ids       uuid[] not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists dpdp_breach_incidents_reported_idx
  on public.dpdp_breach_incidents (reported_at desc);

alter table public.dpdp_breach_incidents enable row level security;

comment on table public.dpdp_breach_incidents is
  'Personal data breach incident log for DPDP breach notification workflow.';

-- No user-facing policies on breach incidents; admin routes use service role.
