-- Lock down DPDP tables: users may read their own rows only.
-- All writes go through authenticated API routes using the service role.

drop policy if exists "dpdp_consent_records_insert_own" on public.dpdp_consent_records;
drop policy if exists "dpdp_consent_records_update_own" on public.dpdp_consent_records;

drop policy if exists "dpdp_rights_requests_insert_own" on public.dpdp_rights_requests;

comment on table public.dpdp_consent_records is
  'Server-side DPDP consent audit trail. Writes via service role only; users may SELECT own rows.';

comment on table public.dpdp_rights_requests is
  'DPDP rights requests. Writes via service role only; users may SELECT own rows.';
