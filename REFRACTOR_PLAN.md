# Refactor Plan — Engine Extraction + FIZAKI (without breaking Kalnehi)

> **Status (2026-06):** FIZAKI was removed from this repo (separate app planned). Kalnehi-only
> vertical config remains. The sections below are historical planning notes for the engine-extraction
> program — not the current deployment topology.

> Step 1–8 deliverable. Companion to `ARCHITECTURE_AUDIT.md`. This is the engine-extraction
> contract: how we generalize Kalnehi's execution engine into a domain-agnostic package,
> prove Kalnehi parity, and add FIZAKI as a second brand on the same codebase + Supabase —
> with the hardening decisions locked in.

## 0. Constraints (non-negotiable)
1. Kalnehi student app must keep working — every route, feature, and row. Parity proven by golden-master diff + regression tests.
2. One engine, configured per vertical. No forked logic.
3. Voice-first, low-friction UX preserved.
4. Incremental, small commits. No deploy, no prod migrations during this program.
5. No student wording in FIZAKI; no sales wording in Kalnehi.

## 1. Topology decision (chosen)
**Single Next.js codebase + in-repo engine package + per-vertical config, deployed twice.**

- Engine lives at `src/engine/**` (alias `@engine/*`), domain-agnostic, no vertical wording.
- Brands are `VerticalConfig` objects; Kalnehi keeps `(kalnehi)` route group, FIZAKI gets a new `(fizaki)` route group.
- Same repo deploys to two Vercel projects: `www.kalnehi.com` and `www.fizaki.in`, each with `NEXT_PUBLIC_VERTICAL` baked at build, host as the runtime source of truth.

**Why not a pnpm/Turbo monorepo:** the app is deeply coupled to Capacitor (remote-URL → kalnehi.com), GitHub-Actions cron, Sentry, and a shared Supabase schema. A monorepo migration risks the live student app for no near-term benefit. **Why not separate Supabase projects:** declined for cost/ops; isolation is achieved at the app layer (§5). Both are revisitable later without re-forking the engine.

## 2. Engine primitives (public API)
Each is an engine module with a typed API and a per-vertical enable/config flag. Mechanics only; words come from the `CopyPack`.

`KnowledgeTree`, `OutcomeMetric`, `Progress → ProjectedOutcome`, `GapPlanner`, `DailyPlan`, `Backlog`, `RevisionScheduler`, `FocusTimer`, `ConsistencyTracker`+Streaks, `DailyDebrief`, `Recaps`, `Coach`, `AssessmentTracker`, `MistakeLog`, `QueryTracker`, `HabitBuilder`, `ProgressAnalytics`+`Leaderboard`, `VoiceNavigation`.

Mapping (student → primitive → sales) is the table from the program brief; preserved verbatim in code comments on each module.

## 3. Boundary enforcement
- tsconfig path `@engine/*`; ESLint `no-restricted-imports` so `src/engine/**` cannot import `src/verticals/**`, `src/content/**`, or exam-specific libs.
- A second lint forbids inserts into vertical-tagged tables outside the `withVertical` helper.

## 4. KnowledgeTree: explicit two-backend adapter
One engine API, `KnowledgeTreeRepository` interface, two adapters:
- `KalnehiSyllabusRepository` → `syllabus_master` (+ `chapter_marks`, exam weightages, 3-yr marks, CUET/UPSC rules). Preserves exact current behavior.
- `FizakiKnowledgeRepository` → new `knowledge_trees`/`knowledge_nodes`.

Engine depends only on the interface (`getTree`, `getNode`, `listMasterableUnits`, `outcomeWeightFor`). Migrating Kalnehi onto `knowledge_nodes` is **out of scope** (future option).

## 5. Identity & isolation (RESOLVED)
**Identity is per-`(email, vertical)`** on one shared Supabase Auth project.

- Supabase keys `auth.users` by email → one email = one auth user. Same email MAY be used on both domains → one auth user, up to two `user_profiles` keyed by composite **`(user_id, vertical)`**. A profile is created ONLY via explicit sign-up on that domain.
- **RLS is not the vertical firewall** — it only sees `auth.uid()`, never the host. Isolation = (a) domain-scoped cookies, (b) app-layer host→vertical guard on every authenticated request, (c) `withVertical(query, vertical)` as the single sanctioned data path for vertical-tagged tables, (d) `p_vertical` filtering INSIDE SQL functions for every `.rpc(` path (see audit §5), (e) RLS retained for row ownership.
- **OAuth first-login gate:** Google OAuth auto-creates `auth.users`. The host→`(user_id, vertical)` provisioning assertion runs in `src/app/auth/callback/route.ts` (and DPDP attestation) per vertical — a Google login on `fizaki.in` provisions only the FIZAKI profile, never the wrong vertical.
- Supabase Auth config: add `www.kalnehi.com`, `www.fizaki.in`, apex, localhost, and a `*.vercel.app` preview entry to Site URL + redirect allowlist; verify Google OAuth origins for both.
- **Tradeoff (recorded):** one shared project cannot give auth-level cryptographic isolation; that would need separate projects (declined). Hard isolation here is app-layer + cookies + per-`(user_id, vertical)` + `withVertical` + in-function RPC filters.

## 6. Data model changes (non-destructive, on a branch first)
- Migration `<ts>_vertical_discriminator.sql`: add nullable `vertical text default 'kalnehi'` to FIZAKI-reused user/content tables; backfill `'kalnehi'`.
- **Default is a migration-window crutch only.** New writes set `vertical` explicitly; `withVertical` stamps it on insert/upsert; CI lint flags omissions. Follow-up migration after backfill: `SET NOT NULL` + `DROP DEFAULT` so a missing vertical is an ERROR, never a misfiled row.
- New tables: `knowledge_trees`, `knowledge_nodes`, `playbook_imports`, `deals`/`pipeline_items`, `ramp_metrics`, `coach_sessions` (or reuse `prepbrain_conversations.vertical`).
- `ALTER` `user_organization_memberships.role` CHECK to add `rep`,`manager`.
- Add `p_vertical` arg + `WHERE vertical = p_vertical` to `match_prepbrain_user_context`, `prepbrain_marks_intelligence`, `recompute_leaderboard_weekly_top_percents`, prepbrain token RPCs; audit remaining `.rpc(`/service-role/cron/admin paths.
- **All authored/applied on a Supabase BRANCH or local clone**, policy-tested (pgTAP-style) + `get_advisors` lint, then promoted. Never run against the prod project serving live Kalnehi users. `npm run types:supabase` refresh after.

## 7. Providers behind interfaces (keep current implementations)
- `LlmProvider` wraps `aiChatClient.ts` (Groq + DeepInfra failover); voice/vision/embeddings brought behind it incrementally.
- `SttProvider` wraps `useVoiceSttRouting.ts`.
- `CrmProvider` ships TWO impls for pilots: manual deal entry + voice, AND a **read-only CSV deal import** so `RampMetric`/attainment runs on real data (not perfect manual logging). Salesforce/HubSpot later behind the same interface.

## 8. FIZAKI surfaces — sequenced for the GTM gate
**Tier 1 (build now — the buyer core):** playbook import → `KnowledgeTree`; one complete rep loop (daily practice → post-call voice debrief → FIZAKI Coach, vertical-scoped); quota-gap planner (`GapPlanner`); pipeline (manual + voice + CSV import); manager dashboard (per-rep ramp, gaps, attainment, consistency); attribution metrics (`RampMetric`: days-to-first-deal, days-to-full-productivity, attainment %, baseline vs current).

**Tier 2 (defer until a pilot is signed):** AssessmentTracker (role-play/call-score), Leaderboard, HabitBuilder for FIZAKI.

**Projection honesty:** "skills mastered → projected quota readiness" is an UNPROVEN model (unlike exam-weightage → marks). v1 keeps it a transparent, clearly-labeled heuristic; the buyer pitch anchors on MEASURED ramp/attainment, not the predicted score.

Roles: Rep (self), Manager (their team), Admin (content + org).

## 9. Verification strategy
- **Golden master FIRST:** capture projection/rollup/`OutcomeMetric`/`GapPlanner`/copy outputs across NEET/JEE/UPSC/CUET + edge cases (empty/partial progress, overrides, multi-exam) BEFORE extraction; diff after = parity gate.
- **Data-leakage tests:** vector search (`match_prepbrain_user_context`) filters by vertical; leaderboard scoped per vertical/org; `withVertical` isolation for a dual-vertical user.
- **Branding smoke tests:** correct copy per domain; zero cross-vertical wording leakage.
- Per phase: `npm run test:unit` + targeted Playwright + `npm run lint`; confirm Kalnehi unchanged.

## 10. Deliverables order (commit after each; no push/deploy)
1. `ARCHITECTURE_AUDIT.md` ✅
2. `REFRACTOR_PLAN.md` ✅ — review gate.
3. Golden-master fixtures (pre-extraction).
4. VerticalConfig + CopyPack + provider interfaces (no behavior change).
5. Engine extraction + `KnowledgeTreeRepository`.
6. Kalnehi onto engine via `KalnehiSyllabusRepository`; parity diff.
7. `vertical` discriminator + FIZAKI tables on branch; role CHECK alter; RPC `p_vertical`; NOT NULL follow-up; policy tests.
8. App vertical guard + `withVertical` + OAuth gate + auth allowlist + host-keyed caching.
9. FIZAKI scaffold + config + branding + roles.
10. FIZAKI Tier-1 buyer core.
11. Leakage + branding tests; seed demo FIZAKI org; dual-domain deploy config; README env docs.
12. (Deferred) FIZAKI Tier-2.

## 11. New env vars (documented in README)
`NEXT_PUBLIC_VERTICAL` (`kalnehi`|`fizaki`), `NEXT_PUBLIC_FIZAKI_DOMAIN`, `NEXT_PUBLIC_KALNEHI_DOMAIN`, and (later) `CRM_PROVIDER`/CRM creds. LLM/STT keys unchanged.
