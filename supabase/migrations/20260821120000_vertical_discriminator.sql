-- ════════════════════════════════════════════════════════════════════════════
-- Vertical discriminator + FIZAKI tables (Phase 1 — non-destructive).
--
-- SAFETY / ROLLOUT (see REFRACTOR_PLAN.md §5, §6):
--   * Apply on a Supabase BRANCH or local clone first — NEVER directly on the prod
--     project serving live Kalnehi users. Run policy tests + get_advisors, then promote.
--   * Adding `vertical text not null default 'kalnehi'` is a METADATA-ONLY change in
--     Postgres (constant default) — no table rewrite, no long lock. Existing Kalnehi
--     rows and all current writes resolve to 'kalnehi' automatically, so the live app
--     keeps working with zero code changes.
--   * The DEFAULT is a transition crutch. It is DROPPED in the Phase 2 follow-up
--     (20260821120100) AFTER the withVertical() helper ships and every insert sets
--     vertical explicitly — at which point a missing vertical becomes a hard error.
--   * RLS is row-ownership only and CANNOT see the request host. Vertical isolation is
--     enforced at the app/query layer (withVertical) and INSIDE SQL functions (see the
--     match_prepbrain_user_context change below). Do not treat RLS as the vertical firewall.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Add `vertical` to shared user-data tables reused across verticals ─────
-- Loop keeps this idempotent and terse. Tables that predate the migration folder
-- (user_profiles, etc.) exist on a prod-cloned branch, so the ALTER is valid there.
do $$
declare
  t text;
  shared_tables text[] := array[
    'user_profiles',
    'daily_plans',
    'daily_tasks',
    'daily_reflections',
    'mistake_logs',
    'doubts',
    'study_sessions',
    'prepbrain_conversations',
    'prepbrain_messages',
    'prepbrain_embeddings',
    'user_revision_queue_items',
    'user_revision_logs',
    'user_revision_topic_state'
  ];
begin
  foreach t in array shared_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format(
        'alter table public.%I add column if not exists vertical text not null default ''kalnehi''',
        t
      );
    end if;
  end loop;
end $$;

-- Composite index for the RAG leak-fix lookup (user + vertical).
create index if not exists prepbrain_embeddings_user_vertical_idx
  on public.prepbrain_embeddings (user_id, vertical);

-- ─── 2. Allow rep / manager roles for FIZAKI orgs ─────────────────────────────
alter table public.user_organization_memberships
  drop constraint if exists user_organization_memberships_role_check;
alter table public.user_organization_memberships
  add constraint user_organization_memberships_role_check
  check (role in ('student', 'faculty', 'admin', 'parent', 'rep', 'manager'));

-- ─── 3. FIZAKI KnowledgeTree backend (FizakiKnowledgeRepository) ──────────────
create table if not exists public.knowledge_trees (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  vertical        text not null default 'fizaki',
  name            text not null,
  source          text not null default 'manual' check (source in ('manual', 'import')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.knowledge_nodes (
  id          uuid primary key default gen_random_uuid(),
  tree_id     uuid not null references public.knowledge_trees(id) on delete cascade,
  parent_id   uuid references public.knowledge_nodes(id) on delete cascade,
  vertical    text not null default 'fizaki',
  kind        text not null check (kind in ('module', 'skill', 'micro')),
  label       text not null,
  weight      numeric not null default 1,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.node_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  node_id     uuid not null references public.knowledge_nodes(id) on delete cascade,
  vertical    text not null default 'fizaki',
  status      text not null default 'not_begun'
                check (status in ('not_begun', 'in_progress', 'completed')),
  updated_at  timestamptz not null default now(),
  unique (user_id, node_id)
);

create table if not exists public.playbook_imports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  vertical        text not null default 'fizaki',
  filename        text,
  raw_text        text,
  status          text not null default 'pending'
                    check (status in ('pending', 'structured', 'failed')),
  tree_id         uuid references public.knowledge_trees(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ─── 4. FIZAKI pipeline + attribution ─────────────────────────────────────────
create table if not exists public.deals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  vertical        text not null default 'fizaki',
  external_id     text not null,
  name            text not null,
  amount          numeric not null default 0,
  currency        text not null default 'INR',
  stage           text not null
                    check (stage in ('lead','qualified','proposal','negotiation','won','lost')),
  lost_reason     text,
  source          text not null default 'manual' check (source in ('manual', 'csv')),
  created_at      timestamptz not null default now(),
  closed_at       timestamptz,
  unique (user_id, external_id)
);

create table if not exists public.ramp_metrics (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  vertical        text not null default 'fizaki',
  metric_key      text not null
                    check (metric_key in (
                      'days_to_first_deal',
                      'days_to_full_productivity',
                      'quota_attainment_pct'
                    )),
  baseline_value  numeric,
  current_value   numeric,
  captured_at     timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, metric_key)
);

-- ─── 5. Indexes ───────────────────────────────────────────────────────────────
create index if not exists knowledge_trees_org_idx on public.knowledge_trees (organization_id);
create index if not exists knowledge_nodes_tree_idx on public.knowledge_nodes (tree_id);
create index if not exists knowledge_nodes_parent_idx on public.knowledge_nodes (parent_id);
create index if not exists node_progress_user_idx on public.node_progress (user_id);
create index if not exists deals_user_idx on public.deals (user_id);
create index if not exists deals_org_idx on public.deals (organization_id);
create index if not exists ramp_metrics_user_idx on public.ramp_metrics (user_id);
create index if not exists playbook_imports_org_idx on public.playbook_imports (organization_id);

-- ─── 6. RLS on new tables ──────────────────────────────────────────────────────
alter table public.knowledge_trees   enable row level security;
alter table public.knowledge_nodes   enable row level security;
alter table public.node_progress     enable row level security;
alter table public.playbook_imports  enable row level security;
alter table public.deals             enable row level security;
alter table public.ramp_metrics      enable row level security;

-- Playbook content: readable by members of the owning org (or global trees); writes are
-- service-role / admin only (deny client writes).
create policy knowledge_trees_select_org on public.knowledge_trees
  for select to authenticated
  using (organization_id is null or organization_id = public.get_org_id_from_jwt());
create policy knowledge_trees_deny_client_write on public.knowledge_trees
  for insert to authenticated with check (false);

create policy knowledge_nodes_select_org on public.knowledge_nodes
  for select to authenticated
  using (
    exists (
      select 1 from public.knowledge_trees kt
      where kt.id = knowledge_nodes.tree_id
        and (kt.organization_id is null or kt.organization_id = public.get_org_id_from_jwt())
    )
  );
create policy knowledge_nodes_deny_client_write on public.knowledge_nodes
  for insert to authenticated with check (false);

create policy playbook_imports_select_org on public.playbook_imports
  for select to authenticated
  using (organization_id is null or organization_id = public.get_org_id_from_jwt());
create policy playbook_imports_deny_client_write on public.playbook_imports
  for insert to authenticated with check (false);

-- Per-rep rows: own-row read/write (managers read via service-role admin queries).
create policy node_progress_rw_own on public.node_progress
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy deals_rw_own on public.deals
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy ramp_metrics_select_own on public.ramp_metrics
  for select to authenticated
  using (auth.uid() = user_id);
create policy ramp_metrics_deny_client_write on public.ramp_metrics
  for insert to authenticated with check (false);

-- ─── 7. Vertical-scope the RAG retrieval (IN-FUNCTION filter) ──────────────────
-- match_prepbrain_user_context bypasses app-layer filtering, so the vertical guard MUST
-- live inside the function. p_vertical has a default of 'kalnehi', so existing 4-arg
-- callers (and the unchanged prod app) keep working; the app will pass it explicitly
-- once the app-vertical-guard phase deploys alongside this migration.
drop function if exists public.match_prepbrain_user_context(uuid, extensions.vector, float, int);

create or replace function public.match_prepbrain_user_context(
  p_user_id uuid,
  p_query_embedding extensions.vector(1024),
  p_match_threshold float default 0.5,
  p_match_count int default 5,
  p_vertical text default 'kalnehi'
)
returns table (
  source_type text,
  source_id text,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    e.source_type,
    e.source_id,
    e.content,
    1 - (e.embedding <=> p_query_embedding) as similarity
  from public.prepbrain_embeddings e
  where e.user_id = p_user_id
    and e.vertical = p_vertical
    and 1 - (e.embedding <=> p_query_embedding) > p_match_threshold
  order by e.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 10));
$$;

revoke all on function public.match_prepbrain_user_context(uuid, extensions.vector, float, int, text) from public;
grant execute on function public.match_prepbrain_user_context(uuid, extensions.vector, float, int, text) to authenticated;
grant execute on function public.match_prepbrain_user_context(uuid, extensions.vector, float, int, text) to service_role;

comment on function public.match_prepbrain_user_context is
  'Cosine similarity search over PrepBrain user embeddings for RAG. Vertical-scoped: only returns rows matching p_vertical (default kalnehi) to prevent cross-brand Coach leakage.';
