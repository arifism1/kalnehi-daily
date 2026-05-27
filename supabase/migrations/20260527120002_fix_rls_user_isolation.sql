-- B2B Multi-Tenancy: RLS Security Fix
--
-- Addresses two classes of vulnerability introduced by 20260527120001_multi_tenancy_rls.sql:
--
-- CLASS A — Child tables (daily_tasks, task_sessions, mock_test_subject_scores):
--   These tables have no direct user_id column. The org_or_b2c_* policies added
--   `organization_id IS NULL` as a permissive OR arm. Because ALL B2C rows have
--   organization_id = NULL, this let any authenticated user read every other user's
--   daily_tasks, task_sessions, and mock_test_subject_scores. DROP these policies;
--   the existing per-operation subquery policies (via parent FK) already provide
--   correct isolation. task_sessions had no prior isolation policy — add one now.
--
-- CLASS B — User-keyed tables (all 37 tables with a direct user_id / id column):
--   The B2B arm `organization_id = get_org_id_from_jwt()` had no user_id restriction,
--   letting Student A read Student B's rows when both belong to the same org.
--   Fix: `auth.uid() = user_id AND (organization_id IS NULL OR organization_id = get_org_id_from_jwt())`
--   This correctly scopes each user to their own rows regardless of B2C/B2B status.
--   All B2B admin/faculty reads use the service role client (bypasses RLS), so no
--   cross-user read is needed at the RLS level.

-- ─── CLASS A: Drop insecure child-table policies ──────────────────────────────

-- daily_tasks: existing daily_tasks_*_own policies use EXISTS through daily_plans
-- for proper user isolation. The new policy was redundant AND opened all B2C rows.
drop policy if exists "org_or_b2c_daily_tasks" on public.daily_tasks;

-- mock_test_subject_scores: existing mock_test_subject_scores_*_own policies use
-- EXISTS through mock_tests. Same issue.
drop policy if exists "org_or_b2c_mock_test_subject_scores" on public.mock_test_subject_scores;

-- task_sessions: the org_or_b2c policy opened all B2C task_sessions to everyone.
-- Replace with a safe parent-FK policy: only own tasks' sessions are accessible.
drop policy if exists "org_or_b2c_task_sessions" on public.task_sessions;
create policy "task_sessions_own_tasks_only"
  on public.task_sessions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.user_id = auth.uid()
    )
  );

-- ─── CLASS B: Recreate user-keyed policies with user_id restriction ───────────
-- Pattern: auth.uid() = <user_id_col> AND (org IS NULL OR org = jwt_claim)
-- This is safe for both B2C (org IS NULL) and B2B (org = claim, user still owns the row).

-- user_profiles (PK `id` is the auth user_id)
drop policy if exists "org_or_b2c_user_profiles" on public.user_profiles;
create policy "org_or_b2c_user_profiles"
  on public.user_profiles for all to authenticated
  using (
    auth.uid() = id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- daily_plans
drop policy if exists "org_or_b2c_daily_plans" on public.daily_plans;
create policy "org_or_b2c_daily_plans"
  on public.daily_plans for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- tasks
drop policy if exists "org_or_b2c_tasks" on public.tasks;
create policy "org_or_b2c_tasks"
  on public.tasks for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_microtopic_progress
drop policy if exists "org_or_b2c_user_microtopic_progress" on public.user_microtopic_progress;
create policy "org_or_b2c_user_microtopic_progress"
  on public.user_microtopic_progress for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_progress
drop policy if exists "org_or_b2c_user_progress" on public.user_progress;
create policy "org_or_b2c_user_progress"
  on public.user_progress for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_syllabus_backlog
drop policy if exists "org_or_b2c_user_syllabus_backlog" on public.user_syllabus_backlog;
create policy "org_or_b2c_user_syllabus_backlog"
  on public.user_syllabus_backlog for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_syllabus_customizations
drop policy if exists "org_or_b2c_user_syllabus_customizations" on public.user_syllabus_customizations;
create policy "org_or_b2c_user_syllabus_customizations"
  on public.user_syllabus_customizations for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_syllabus_marks_overrides
drop policy if exists "org_or_b2c_user_syllabus_marks_overrides" on public.user_syllabus_marks_overrides;
create policy "org_or_b2c_user_syllabus_marks_overrides"
  on public.user_syllabus_marks_overrides for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_revision_queue_items
drop policy if exists "org_or_b2c_user_revision_queue_items" on public.user_revision_queue_items;
create policy "org_or_b2c_user_revision_queue_items"
  on public.user_revision_queue_items for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_revision_logs
drop policy if exists "org_or_b2c_user_revision_logs" on public.user_revision_logs;
create policy "org_or_b2c_user_revision_logs"
  on public.user_revision_logs for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_revision_topic_state
drop policy if exists "org_or_b2c_user_revision_topic_state" on public.user_revision_topic_state;
create policy "org_or_b2c_user_revision_topic_state"
  on public.user_revision_topic_state for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- mock_tests
drop policy if exists "org_or_b2c_mock_tests" on public.mock_tests;
create policy "org_or_b2c_mock_tests"
  on public.mock_tests for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- mistake_logs
drop policy if exists "org_or_b2c_mistake_logs" on public.mistake_logs;
create policy "org_or_b2c_mistake_logs"
  on public.mistake_logs for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_habits
drop policy if exists "org_or_b2c_user_habits" on public.user_habits;
create policy "org_or_b2c_user_habits"
  on public.user_habits for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- habit_logs
drop policy if exists "org_or_b2c_habit_logs" on public.habit_logs;
create policy "org_or_b2c_habit_logs"
  on public.habit_logs for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- study_sessions
drop policy if exists "org_or_b2c_study_sessions" on public.study_sessions;
create policy "org_or_b2c_study_sessions"
  on public.study_sessions for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_meditation_sessions
drop policy if exists "org_or_b2c_user_meditation_sessions" on public.user_meditation_sessions;
create policy "org_or_b2c_user_meditation_sessions"
  on public.user_meditation_sessions for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_push_tokens
drop policy if exists "org_or_b2c_user_push_tokens" on public.user_push_tokens;
create policy "org_or_b2c_user_push_tokens"
  on public.user_push_tokens for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_scheduled_notifications
drop policy if exists "org_or_b2c_user_scheduled_notifications" on public.user_scheduled_notifications;
create policy "org_or_b2c_user_scheduled_notifications"
  on public.user_scheduled_notifications for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_custom_notifications
drop policy if exists "org_or_b2c_user_custom_notifications" on public.user_custom_notifications;
create policy "org_or_b2c_user_custom_notifications"
  on public.user_custom_notifications for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_notifications
drop policy if exists "org_or_b2c_user_notifications" on public.user_notifications;
create policy "org_or_b2c_user_notifications"
  on public.user_notifications for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_journey_metrics
drop policy if exists "org_or_b2c_user_journey_metrics" on public.user_journey_metrics;
create policy "org_or_b2c_user_journey_metrics"
  on public.user_journey_metrics for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_journey_state
drop policy if exists "org_or_b2c_user_journey_state" on public.user_journey_state;
create policy "org_or_b2c_user_journey_state"
  on public.user_journey_state for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_app_active_time_daily
drop policy if exists "org_or_b2c_user_app_active_time_daily" on public.user_app_active_time_daily;
create policy "org_or_b2c_user_app_active_time_daily"
  on public.user_app_active_time_daily for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_activity_logs
drop policy if exists "org_or_b2c_user_activity_logs" on public.user_activity_logs;
create policy "org_or_b2c_user_activity_logs"
  on public.user_activity_logs for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_xp
drop policy if exists "org_or_b2c_user_xp" on public.user_xp;
create policy "org_or_b2c_user_xp"
  on public.user_xp for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- xp_events
drop policy if exists "org_or_b2c_xp_events" on public.xp_events;
create policy "org_or_b2c_xp_events"
  on public.xp_events for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_stats
drop policy if exists "org_or_b2c_user_stats" on public.user_stats;
create policy "org_or_b2c_user_stats"
  on public.user_stats for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- prepbrain_conversations
drop policy if exists "org_or_b2c_prepbrain_conversations" on public.prepbrain_conversations;
create policy "org_or_b2c_prepbrain_conversations"
  on public.prepbrain_conversations for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- voice_timeline_entries
drop policy if exists "org_or_b2c_voice_timeline_entries" on public.voice_timeline_entries;
create policy "org_or_b2c_voice_timeline_entries"
  on public.voice_timeline_entries for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_voice_usage_events
drop policy if exists "org_or_b2c_user_voice_usage_events" on public.user_voice_usage_events;
create policy "org_or_b2c_user_voice_usage_events"
  on public.user_voice_usage_events for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_productivity_planner
drop policy if exists "org_or_b2c_user_productivity_planner" on public.user_productivity_planner;
create policy "org_or_b2c_user_productivity_planner"
  on public.user_productivity_planner for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_target_blueprints
drop policy if exists "org_or_b2c_user_target_blueprints" on public.user_target_blueprints;
create policy "org_or_b2c_user_target_blueprints"
  on public.user_target_blueprints for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_backlog_vents
drop policy if exists "org_or_b2c_user_backlog_vents" on public.user_backlog_vents;
create policy "org_or_b2c_user_backlog_vents"
  on public.user_backlog_vents for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_feedback
drop policy if exists "org_or_b2c_user_feedback" on public.user_feedback;
create policy "org_or_b2c_user_feedback"
  on public.user_feedback for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );

-- user_quick_exam_todos
drop policy if exists "org_or_b2c_user_quick_exam_todos" on public.user_quick_exam_todos;
create policy "org_or_b2c_user_quick_exam_todos"
  on public.user_quick_exam_todos for all to authenticated
  using (
    auth.uid() = user_id
    and (organization_id is null or organization_id = public.get_org_id_from_jwt())
  );
