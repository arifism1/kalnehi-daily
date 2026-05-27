# ADR 0001: Multi-tenancy (organizations / institutes)

## Status

Deferred until an institutional customer requires org-level tenancy.

## Context

Kalnehi uses `user_id` as the sole tenant key across tables and RLS policies. Coaching institutes, batches, and org-level billing need `org_id` (or `tenant_id`) on most domain tables.

## Decision

Do not implement multi-tenancy in the current remediation pass. Document the migration path so a future project can execute it deliberately.

## Proposed migration path (when needed)

1. **Schema**
   - Add `organizations` (`id`, `name`, `slug`, `created_at`).
   - Add `org_memberships` (`org_id`, `user_id`, `role` enum: `owner` | `admin` | `coach` | `student`).
   - Add nullable `org_id` to: `user_profiles`, `study_sessions`, `user_syllabi`, `scheduled_notifications`, subscription/billing tables, and admin analytics aggregates.

2. **RLS**
   - Replace `auth.uid() = user_id` with:
     - Personal data: `user_id = auth.uid()` OR `org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())` for coach/admin read paths.
   - Service-role crons unchanged; scope queries by `org_id` when sending batch notifications.

3. **Subscriptions**
   - Introduce `org_subscriptions` parallel to user-level Pro; gate features via membership role + org plan.
   - Migrate existing individual Pro users to `org_id IS NULL` (personal tenancy).

4. **App**
   - Org switcher in settings; batch views filtered by `org_id`.
   - PrepBrain RAG embeddings scoped by `(user_id, org_id)` or org-shared corpus per product decision.

5. **Rollout**
   - Phase 1: nullable `org_id`, backfill NULL, no behavior change.
   - Phase 2: institute onboarding + RLS tightening.
   - Phase 3: org billing.

## Consequences

- Large migration surface (~150 SQL files worth of policy rewrites).
- E2E and cron tests must cover org-scoped data isolation before launch.
