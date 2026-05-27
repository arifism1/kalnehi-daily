-- PrepBrain long-term context: pgvector embeddings (service-role write, user-scoped read via RPC).

create extension if not exists vector with schema extensions;

create table if not exists public.prepbrain_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (
    source_type in ('study_session', 'doubt', 'syllabus_topic', 'daily_reflection')
  ),
  source_id text not null,
  content text not null,
  embedding extensions.vector(1024) not null,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

create index if not exists prepbrain_embeddings_user_id_idx
  on public.prepbrain_embeddings (user_id);

create index if not exists prepbrain_embeddings_ivfflat_idx
  on public.prepbrain_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.prepbrain_embeddings enable row level security;

create policy prepbrain_embeddings_select_own
  on public.prepbrain_embeddings
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserts/updates via service role (embed cron) only.
create policy prepbrain_embeddings_deny_client_write
  on public.prepbrain_embeddings
  for insert
  to authenticated
  with check (false);

create policy prepbrain_embeddings_deny_client_update
  on public.prepbrain_embeddings
  for update
  to authenticated
  using (false);

create or replace function public.match_prepbrain_user_context(
  p_user_id uuid,
  p_query_embedding extensions.vector(1024),
  p_match_threshold float default 0.5,
  p_match_count int default 5
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
    and 1 - (e.embedding <=> p_query_embedding) > p_match_threshold
  order by e.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 10));
$$;

revoke all on function public.match_prepbrain_user_context(uuid, extensions.vector, float, int) from public;
grant execute on function public.match_prepbrain_user_context(uuid, extensions.vector, float, int) to authenticated;
grant execute on function public.match_prepbrain_user_context(uuid, extensions.vector, float, int) to service_role;

comment on function public.match_prepbrain_user_context is
  'Cosine similarity search over PrepBrain user embeddings for RAG in chat.';
