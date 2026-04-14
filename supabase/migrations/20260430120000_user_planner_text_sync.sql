-- Offline-first planner text: revision queue, productivity scratchpad, quick exam todos, engine notification prefs.
-- HelpyJi: allow signed-in users to read their own rows (writes remain service-role via /api/helpyji/chat).

-- ---------------------------------------------------------------------------
-- user_revision_queue_items
-- ---------------------------------------------------------------------------
create table public.user_revision_queue_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  microtopic_id text null,
  difficulty text not null
    constraint user_revision_queue_items_difficulty_chk
      check (difficulty in ('hard', 'medium', 'easy')),
  next_due date not null,
  last_reviewed date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_revision_queue_items_title_len check (char_length(title) <= 500)
);

create index user_revision_queue_items_user_next_due_idx
  on public.user_revision_queue_items (user_id, next_due);

alter table public.user_revision_queue_items enable row level security;

create policy "user_revision_queue_items_select_own"
  on public.user_revision_queue_items for select
  using (auth.uid() = user_id);

create policy "user_revision_queue_items_insert_own"
  on public.user_revision_queue_items for insert
  with check (auth.uid() = user_id);

create policy "user_revision_queue_items_update_own"
  on public.user_revision_queue_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_revision_queue_items_delete_own"
  on public.user_revision_queue_items for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_productivity_planner (one row per user)
-- ---------------------------------------------------------------------------
create table public.user_productivity_planner (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notes text not null default '',
  p1 text not null default '',
  p2 text not null default '',
  p3 text not null default '',
  updated_at timestamptz not null default now(),
  constraint user_productivity_planner_field_len check (
    char_length(notes) <= 20000
    and char_length(p1) <= 500
    and char_length(p2) <= 500
    and char_length(p3) <= 500
  )
);

alter table public.user_productivity_planner enable row level security;

create policy "user_productivity_planner_select_own"
  on public.user_productivity_planner for select
  using (auth.uid() = user_id);

create policy "user_productivity_planner_insert_own"
  on public.user_productivity_planner for insert
  with check (auth.uid() = user_id);

create policy "user_productivity_planner_update_own"
  on public.user_productivity_planner for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_productivity_planner_delete_own"
  on public.user_productivity_planner for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_quick_exam_todos
-- ---------------------------------------------------------------------------
create table public.user_quick_exam_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  priority text not null
    constraint user_quick_exam_todos_priority_chk
      check (priority in ('high', 'med', 'low')),
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_quick_exam_todos_text_len check (char_length(text) <= 2000)
);

create index user_quick_exam_todos_user_position_idx
  on public.user_quick_exam_todos (user_id, position);

alter table public.user_quick_exam_todos enable row level security;

create policy "user_quick_exam_todos_select_own"
  on public.user_quick_exam_todos for select
  using (auth.uid() = user_id);

create policy "user_quick_exam_todos_insert_own"
  on public.user_quick_exam_todos for insert
  with check (auth.uid() = user_id);

create policy "user_quick_exam_todos_update_own"
  on public.user_quick_exam_todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_quick_exam_todos_delete_own"
  on public.user_quick_exam_todos for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_engine_notification_prefs (one row per user; jsonb shape = NotificationPrefs)
-- ---------------------------------------------------------------------------
create table public.user_engine_notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_engine_notification_prefs_is_object
    check (jsonb_typeof(prefs) = 'object')
);

alter table public.user_engine_notification_prefs enable row level security;

create policy "user_engine_notification_prefs_select_own"
  on public.user_engine_notification_prefs for select
  using (auth.uid() = user_id);

create policy "user_engine_notification_prefs_insert_own"
  on public.user_engine_notification_prefs for insert
  with check (auth.uid() = user_id);

create policy "user_engine_notification_prefs_update_own"
  on public.user_engine_notification_prefs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_engine_notification_prefs_delete_own"
  on public.user_engine_notification_prefs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- HelpyJi: read-only for authenticated owner (insert/update/delete stay API/service role).
-- ---------------------------------------------------------------------------
drop policy if exists "helpyji_conversations_select_own" on public.helpyji_conversations;
create policy "helpyji_conversations_select_own"
  on public.helpyji_conversations for select
  using (auth.uid() = user_id);

comment on policy "helpyji_conversations_select_own" on public.helpyji_conversations is
  'Lets signed-in clients hydrate chat history; writes remain via service role in /api/helpyji/chat.';
