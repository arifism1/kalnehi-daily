-- ════════════════════════════════════════════════════════════════════════════
-- Vertical discriminator — Phase 2 follow-up: DROP DEFAULT (fail-loud).
--
-- DO NOT APPLY until BOTH are true (see REFRACTOR_PLAN.md §6 + hardening item #8):
--   1. The withVertical() helper has shipped and stamps `vertical` on every insert/
--      upsert to the shared tables, AND
--   2. Production has run long enough to confirm no code path inserts without it
--      (CI lint for missing `vertical` is green; no 'kalnehi'-defaulted FIZAKI rows).
--
-- Effect: the column stays NOT NULL (already set in Phase 1) but loses its DEFAULT, so
-- any insert that forgets to set `vertical` now ERRORS instead of silently misfiling the
-- row under 'kalnehi'. This closes the silent-leak trap.
--
-- Apply on a branch first; verify the app still inserts cleanly; then promote.
-- ════════════════════════════════════════════════════════════════════════════

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
      execute format('alter table public.%I alter column vertical drop default', t);
    end if;
  end loop;
end $$;
