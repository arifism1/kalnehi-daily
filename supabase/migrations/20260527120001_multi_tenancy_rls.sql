-- B2B Multi-Tenancy: Phase 1 — RLS Policies
--
-- Strategy: JWT claims (NOT subquery)
-- ─────────────────────────────────────
-- A correlated subquery inside USING (e.g. SELECT from user_organization_memberships
-- WHERE user_id = auth.uid()) executes once per row on high-frequency tables like
-- tasks / daily_tasks / user_microtopic_progress, and collapses at scale.
--
-- Instead, proxy.ts writes organization_id into auth.jwt() app_metadata once
-- (on stale-token detection), then calls refreshSession() so the current request
-- already carries the updated JWT. All RLS policies read from the JWT claim —
-- an O(1) value already in memory for the entire request lifecycle.
--
-- B2C path:  organization_id IS NULL AND auth.uid() = user_id  (unchanged behaviour)
-- B2B path:  organization_id = get_org_id_from_jwt()           (one JWT field read)

-- ─── Helper function ──────────────────────────────────────────────────────────

create or replace function public.get_org_id_from_jwt()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
$$;

comment on function public.get_org_id_from_jwt() is
  'Reads organization_id from the JWT app_metadata claim. Written by proxy.ts on
  stale-token detection via supabase.auth.admin.updateUser + refreshSession().
  Returns NULL for pure B2C users (no org membership).';

-- ─── New table policies ───────────────────────────────────────────────────────

-- organizations: members can read their own org; mutations via service role only.
create policy "org_members_read_own_org"
  on public.organizations
  for select
  to authenticated
  using (id = public.get_org_id_from_jwt());

-- org_batches: members of the org can read their batches.
create policy "org_members_read_batches"
  on public.org_batches
  for select
  to authenticated
  using (organization_id = public.get_org_id_from_jwt());

-- user_organization_memberships: users can read their own membership row.
create policy "users_read_own_membership"
  on public.user_organization_memberships
  for select
  to authenticated
  using (user_id = auth.uid());

-- institute_assignments: org members can read assignments for their org.
create policy "org_members_read_assignments"
  on public.institute_assignments
  for select
  to authenticated
  using (organization_id = public.get_org_id_from_jwt());

-- ─── Macro for user-data table policies ──────────────────────────────────────
-- Each policy covers both B2C (org_id IS NULL) and B2B (org_id matches JWT).
-- Tables that had a prior single-user policy (user_id = auth.uid()) remain
-- backward-compatible because B2C rows have organization_id = NULL.

-- user_profiles
create policy "org_or_b2c_user_profiles"
  on public.user_profiles
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- daily_plans
create policy "org_or_b2c_daily_plans"
  on public.daily_plans
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- daily_tasks: keyed via daily_plan_id → daily_plans (no direct user_id column).
-- The parent daily_plans RLS already provides user isolation for B2C rows.
create policy "org_or_b2c_daily_tasks"
  on public.daily_tasks
  for all
  to authenticated
  using (
    organization_id is null
    or organization_id = public.get_org_id_from_jwt()
  );

-- tasks
create policy "org_or_b2c_tasks"
  on public.tasks
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- task_sessions: keyed via task_id → tasks (no direct user_id column).
-- The parent tasks RLS already provides user isolation for B2C rows.
create policy "org_or_b2c_task_sessions"
  on public.task_sessions
  for all
  to authenticated
  using (
    organization_id is null
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_microtopic_progress
create policy "org_or_b2c_user_microtopic_progress"
  on public.user_microtopic_progress
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_progress
create policy "org_or_b2c_user_progress"
  on public.user_progress
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_syllabus_backlog
create policy "org_or_b2c_user_syllabus_backlog"
  on public.user_syllabus_backlog
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_syllabus_customizations
create policy "org_or_b2c_user_syllabus_customizations"
  on public.user_syllabus_customizations
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_syllabus_marks_overrides
create policy "org_or_b2c_user_syllabus_marks_overrides"
  on public.user_syllabus_marks_overrides
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_revision_queue_items
create policy "org_or_b2c_user_revision_queue_items"
  on public.user_revision_queue_items
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_revision_logs
create policy "org_or_b2c_user_revision_logs"
  on public.user_revision_logs
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_revision_topic_state
create policy "org_or_b2c_user_revision_topic_state"
  on public.user_revision_topic_state
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- mock_tests
create policy "org_or_b2c_mock_tests"
  on public.mock_tests
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- mock_test_subject_scores: keyed via mock_test_id → mock_tests (no direct user_id).
-- The parent mock_tests RLS already provides user isolation for B2C rows.
create policy "org_or_b2c_mock_test_subject_scores"
  on public.mock_test_subject_scores
  for all
  to authenticated
  using (
    organization_id is null
    or organization_id = public.get_org_id_from_jwt()
  );

-- mistake_logs
create policy "org_or_b2c_mistake_logs"
  on public.mistake_logs
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_habits
create policy "org_or_b2c_user_habits"
  on public.user_habits
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- habit_logs
create policy "org_or_b2c_habit_logs"
  on public.habit_logs
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- study_sessions
create policy "org_or_b2c_study_sessions"
  on public.study_sessions
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_meditation_sessions
create policy "org_or_b2c_user_meditation_sessions"
  on public.user_meditation_sessions
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_push_tokens
create policy "org_or_b2c_user_push_tokens"
  on public.user_push_tokens
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_scheduled_notifications
create policy "org_or_b2c_user_scheduled_notifications"
  on public.user_scheduled_notifications
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_custom_notifications
create policy "org_or_b2c_user_custom_notifications"
  on public.user_custom_notifications
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_notifications
create policy "org_or_b2c_user_notifications"
  on public.user_notifications
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_journey_metrics
create policy "org_or_b2c_user_journey_metrics"
  on public.user_journey_metrics
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_journey_state
create policy "org_or_b2c_user_journey_state"
  on public.user_journey_state
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_app_active_time_daily
create policy "org_or_b2c_user_app_active_time_daily"
  on public.user_app_active_time_daily
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_activity_logs
create policy "org_or_b2c_user_activity_logs"
  on public.user_activity_logs
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_xp
create policy "org_or_b2c_user_xp"
  on public.user_xp
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- xp_events
create policy "org_or_b2c_xp_events"
  on public.xp_events
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_stats
create policy "org_or_b2c_user_stats"
  on public.user_stats
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- prepbrain_conversations
create policy "org_or_b2c_prepbrain_conversations"
  on public.prepbrain_conversations
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- voice_timeline_entries
create policy "org_or_b2c_voice_timeline_entries"
  on public.voice_timeline_entries
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_voice_usage_events
create policy "org_or_b2c_user_voice_usage_events"
  on public.user_voice_usage_events
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_productivity_planner
create policy "org_or_b2c_user_productivity_planner"
  on public.user_productivity_planner
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_target_blueprints
create policy "org_or_b2c_user_target_blueprints"
  on public.user_target_blueprints
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_backlog_vents
create policy "org_or_b2c_user_backlog_vents"
  on public.user_backlog_vents
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_feedback
create policy "org_or_b2c_user_feedback"
  on public.user_feedback
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );

-- user_quick_exam_todos
create policy "org_or_b2c_user_quick_exam_todos"
  on public.user_quick_exam_todos
  for all
  to authenticated
  using (
    (organization_id is null and auth.uid() = user_id)
    or organization_id = public.get_org_id_from_jwt()
  );
