-- B2B Multi-Tenancy: Phase 0
-- Step A: New tables (organizations, org_batches, memberships, assignments)
-- Step B: Nullable organization_id on all user-keyed study-data tables
--
-- Key behaviors:
--   * All existing rows remain with organization_id = NULL → pure B2C (untouched).
--   * ON DELETE SET NULL on user data → students become solo B2C if org is removed.
--   * ON DELETE CASCADE on institute_assignments → proprietary content purged cleanly.
--
-- NOTE: The existing `batches` table is the waitlist-batch system; new institute
-- batches live in `org_batches` to avoid collision.

-- ─── Step A: Core multi-tenancy tables ────────────────────────────────────────

create table if not exists public.organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text unique not null,
  logo_url          text,
  primary_color     text not null default '#FF7A00',
  accent_color      text not null default '#FAF7F2',
  custom_domain     text unique,
  settings          jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.organizations is
  'B2B institutes / coaching centres that use Kalnehi as a white-labelled platform.';

create table if not exists public.org_batches (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  exam_type         text not null,
  faculty_id        uuid references public.admin_users(user_id) on delete set null,
  created_at        timestamptz not null default now()
);

comment on table public.org_batches is
  'Class batches within an organization (e.g. NEET 2027 Batch A).';

create table if not exists public.user_organization_memberships (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  batch_id          uuid references public.org_batches(id) on delete set null,
  role              text not null check (role in ('student', 'faculty', 'admin', 'parent')),
  joined_at         timestamptz not null default now(),
  unique (user_id, organization_id)
);

comment on table public.user_organization_memberships is
  'Links auth users to an organization with a role. A user can belong to at most one org (UNIQUE constraint).';

create table if not exists public.institute_assignments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  batch_id          uuid references public.org_batches(id) on delete cascade,
  task_type         text not null,
  data_json         jsonb not null,
  scheduled_for     timestamptz,
  created_at        timestamptz not null default now()
);

comment on table public.institute_assignments is
  'Proprietary task/assignment templates pushed by institutes to their batches.
  Uses ON DELETE CASCADE — content is fully purged if the org is removed.';

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists org_batches_organization_id_idx
  on public.org_batches (organization_id);

create index if not exists user_org_memberships_user_id_idx
  on public.user_organization_memberships (user_id);

create index if not exists user_org_memberships_org_id_idx
  on public.user_organization_memberships (organization_id);

create index if not exists institute_assignments_org_id_idx
  on public.institute_assignments (organization_id);

create index if not exists institute_assignments_batch_id_idx
  on public.institute_assignments (batch_id);

-- ─── Enable RLS on new tables (policies applied in next migration) ─────────────

alter table public.organizations enable row level security;
alter table public.org_batches enable row level security;
alter table public.user_organization_memberships enable row level security;
alter table public.institute_assignments enable row level security;

-- ─── Step B: Add nullable organization_id to user-keyed study-data tables ─────
-- All use ON DELETE SET NULL so that org deletion reverts students to B2C.

-- Core daily plan & task tables
alter table public.user_profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.daily_plans
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.daily_tasks
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.tasks
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.task_sessions
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Syllabus & progress
alter table public.user_microtopic_progress
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_progress
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_syllabus_backlog
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_syllabus_customizations
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_syllabus_marks_overrides
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Revision
alter table public.user_revision_queue_items
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_revision_logs
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_revision_topic_state
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Mock tests & mistake logs
alter table public.mock_tests
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.mock_test_subject_scores
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.mistake_logs
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Habits
alter table public.user_habits
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.habit_logs
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Study sessions
alter table public.study_sessions
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_meditation_sessions
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Notifications & push
alter table public.user_push_tokens
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_scheduled_notifications
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_custom_notifications
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_notifications
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Journey & analytics
alter table public.user_journey_metrics
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_journey_state
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_app_active_time_daily
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_activity_logs
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- XP & stats
alter table public.user_xp
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.xp_events
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_stats
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- PrepBrain AI
alter table public.prepbrain_conversations
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Voice
alter table public.voice_timeline_entries
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_voice_usage_events
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Other student data
alter table public.user_productivity_planner
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_target_blueprints
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_backlog_vents
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_feedback
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.user_quick_exam_todos
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- ─── Indexes on organization_id for high-frequency tables ─────────────────────

create index if not exists tasks_organization_id_idx
  on public.tasks (organization_id) where organization_id is not null;

create index if not exists daily_tasks_organization_id_idx
  on public.daily_tasks (organization_id) where organization_id is not null;

create index if not exists user_profiles_organization_id_idx
  on public.user_profiles (organization_id) where organization_id is not null;

create index if not exists user_microtopic_progress_organization_id_idx
  on public.user_microtopic_progress (organization_id) where organization_id is not null;
