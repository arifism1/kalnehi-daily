# Architecture Audit — Kalnehi Daily

> Step 0 deliverable for the engine-extraction + FIZAKI program.
> Read-only audit of the repository as it exists today. Every named file/table/RPC
> below was verified against the codebase (not assumed). Items that could not be
> confirmed are explicitly flagged.

## 1. Stack

| Concern | Technology | Notes |
|---|---|---|
| Language | TypeScript 5 | `strict` Next.js app |
| Framework | Next.js 16 (App Router) | `proxy.ts` replaces legacy `middleware`; React 19.2 |
| Package manager | npm | `package-lock.json` present; npm scripts drive everything |
| UI / styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | tokens via `--kal-*` CSS vars in `src/app/globals.css`; `@theme inline`, `@custom-variant dark` |
| State | Zustand (14 stores under `src/store/`) | plus React context + IndexedDB (`idb`) for offline |
| DB | Supabase Postgres | ~97 public tables + 1 view; pervasive RLS |
| ORM | None — Supabase JS client | typed via generated `src/types/supabase.ts`; raw SQL migrations |
| Auth | Supabase Auth (`@supabase/ssr`) | Email OTP + Google OAuth; cookie sessions |
| Background jobs | GitHub Actions → `/api/cron/tick` every 5 min | `vercel.json` has NO crons; registry in `src/lib/cron/registry.ts` |
| LLM | Groq (`groq-sdk`) + DeepInfra (OpenAI-compatible `fetch`) | no OpenAI/Anthropic SDK |
| Speech-to-text | Web Speech API / Capacitor plugin / Groq Whisper | platform-routed, no provider interface |
| Vision | DeepInfra Qwen2.5-VL | study camera / study partner |
| Embeddings / RAG | DeepInfra BGE → `match_prepbrain_user_context` RPC | pgvector |
| Payments | Razorpay | webhook + plan routes |
| Native | Capacitor Android (remote-URL → `https://www.kalnehi.com`) | appId `com.kalnehi.daily`, UA marker `KalnehiAndroidApp` |
| Hosting | Vercel | Sentry instrumentation; Upstash/Vercel KV for rate limits + cache |
| Email | Resend | |
| Testing | `node --test` + `tsx` (unit), Playwright (e2e) | scripts in `package.json` |

### Confirmed key files
- LLM failover: `src/lib/aiChatClient.ts` — `ModelCandidate[]`, sequential DeepInfra-primary → Groq-fallback in `callChatCompletion` + `callStreamingChatCompletion`.
- STT routing: `src/hooks/useVoiceSttRouting.ts` (Capacitor native → Web Speech → Groq Whisper).
- RAG: `src/lib/prepbrainEmbeddings.ts` calls `match_prepbrain_user_context` via `asUntypedServiceRole(admin).rpc(...)`. Defined in `supabase/migrations/20260727120100_prepbrain_embeddings_rag.sql`.
- Supabase clients: `src/lib/supabase.ts` (browser), `src/lib/supabase/server.ts`, `src/lib/supabase/routeHandler.ts`, `src/lib/supabase/serviceRoleClient.ts`, `src/lib/supabase/serviceRoleUntyped.ts`.
- Request middleware: `src/proxy.ts` (session refresh, rate limits, Android billing block, B2B org JWT sync).
- Branding: `src/lib/seo-metadata.ts` (`SITE_NAME`/`SITE_BRAND`), `src/config/site.ts`, `src/lib/branding.ts` (B2B white-label), `src/app/manifest.ts`, `src/components/KalnehiMark.tsx`.

## 2. Engine (generic) vs Student-specific (presentation/domain)

Legend: **G** = generic mechanics (engine candidate) · **S** = student/exam domain (vertical layer) · **H** = hybrid (split required).

| Capability | Files | Class |
|---|---|---|
| Progress math / completion bands | `src/lib/progressEngine.ts` | G |
| Daily execution analytics | `src/lib/engine/dailyProgressDashboard.ts` | G |
| Calendar heatmap (R/Y/G) | `src/lib/engine/calendarHeatmap.ts` | G |
| Feedback insight cards | `src/lib/engine/feedbackInsights.ts` | G |
| Revision spaced-repetition intervals | `src/lib/engine/revisionSchedule.ts` | G |
| Backlog auto-reschedule capacity rules | `src/lib/backlogRecoveryScheduling.ts`, `src/lib/backlogRecoveryConstants.ts` | G |
| Leaderboard composite scoring | `src/lib/leaderboardComposite.ts` | G |
| Effective-day completion | `src/lib/effectiveDayCompletion.ts` | G |
| Focus timer | `src/components/engine/TimerEngineClient.tsx`, `src/store/useActiveTimerStore.ts`, `src/store/useDailyTaskTimerStore.ts` | G |
| Daily plan (voice + manual) | `src/components/planner/*`, `src/lib/dailyPlan*`, `src/actions/dailyPlan.ts` | H |
| Daily debrief / reflections | `src/components/reflection/*`, `src/actions/dailyReflections.ts` | G |
| Recaps (daily/weekly/monthly) | `src/components/recap/*`, recap hooks | G |
| Habits | `src/components/habits/*`, `src/actions/habits.ts` | G |
| Mistake log | `src/components/mistake-log/*`, `src/actions/mistakeLogs.ts` | G |
| Doubt/query tracker | `src/components/doubts/*`, `src/store/useDoubtStore.ts` | H (subjects are exam-y) |
| Coach (LLM) | `src/app/api/prepbrain/chat/route.ts`, `src/lib/prepBrain*`, `src/lib/prepbrain*` | H (mechanics G, prompt/context S) |
| Voice navigation | `src/lib/voiceLocalIntent.ts`, `src/lib/voiceCommandGroq.ts`, `src/components/voice/*` | H (nav paths/copy S) |
| Marks engine stats | `src/lib/engine/marksEngineStats.ts` | H (task stats G; NEET/CUET/UPSC projections S) |
| Syllabus rollup / projection | `src/lib/syllabusRollup.ts`, `src/lib/syllabusProjectionTrack.ts` | S |
| Syllabus data pipeline | `src/lib/syllabusDataForUser.ts`, `syllabusMasterQuery.ts`, `fetchChapterMarks.ts`, `userSyllabusMerge.ts`, `applySyllabusMarksOverrides.ts`, `syllabusGrouping.ts`, `syllabusDedupe.ts` | S |
| Target score breaker | `src/lib/targetScoreEngine.ts`, `src/lib/targetScoreBlueprint.ts`, `src/actions/targetBlueprint.ts` | S |
| Rank prediction | `src/lib/rankPrediction.ts` | S |
| Exam catalog / tracks | `src/lib/examsCatalog.ts`, `examTracks.ts`, `examProfile.ts`, `examCatalogGroups.ts`, `cuetDomainSubjects.ts`, `upscMainsOptionalSubjects.ts` | S |
| Mock test tracker | `src/components/mock-tests/*`, `src/lib/mockTestExamPresets.ts`, `src/actions/mockTests.ts` | H |
| Feature registry / nav | `src/lib/dashboardFeatures.ts`, `src/config/mainNavigation.ts`, `src/config/searchIndex.ts` | H (structure G, labels S) |
| Subscriptions / trial | `src/lib/freeTrial.ts`, `subscriptionTiers.ts`, `subscriptionGuard.ts`, `src/actions/subscription.ts` | G (product/billing) |

**`src/lib/engine/` today** is analytics/compute only (6 files) — NOT a pluggable kernel. The closest thing to a "vertical" abstraction is **exam tracks** (`examTracks.ts`); there is **no `ProductVertical` / `CopyPack` / terminology layer**.

## 3. Hard-coded student/exam terminology (no i18n / copy layer)

Domain words are inline in TS/TSX. Approximate file counts containing each term:

| Term | components/ | lib/ | app/ | content/ |
|---|---|---|---|---|
| syllabus | 63 | 62 | 49 | 17 |
| exam | 60 | 61 | 60 | 19 |
| chapter | 38 | 40 | 17 | 18 |
| marks | 36 | 35 | 27 | 14 |
| microtopic | 27 | 37 | 3 | 1 |
| rank | 14 | 11 | 8 | 6 |
| student | 7 | 12 | 10 | 11 |

Highest-impact product files for the copy layer: `src/components/syllabus/SyllabusTracker.tsx`, `SyllabusProjectionHeader.tsx`, `ChapterMarksSheet.tsx`; `src/components/planner/UnifiedDailyPlanList.tsx`, `AddEditTaskSheet.tsx`; `src/components/engine/MarksEngineClient.tsx`, `DailyEngineClient.tsx`; `src/components/home/ProgressOverview.tsx`, `HomeHeroCard.tsx`, `RealitySnapshot.tsx`; `src/lib/prepBrainPrompts.ts`, `prepBrainDataSerializer.ts`; `src/lib/progressEngine.ts` (e.g. "Rank at risk"); `src/config/mainNavigation.ts`, `dashboardFeatures.ts`, `searchIndex.ts`, `seo-metadata.ts`; `src/components/voice/GlobalVoiceSheet.tsx`. Marketing pages under `src/app/(marketing)/**` and `src/content/**` are intentionally exam-specific (lower priority unless rebranded).

## 4. Data model (Supabase)

- 161 migrations (`20260405120000` → `20260820120000`). Several core tables (`user_profiles`, `syllabus_master`, `tasks`, XP) **predate** the migration folder — initial DDL is applied out-of-repo; new environments need a baseline before migrations apply.
- **No `vertical`/`product` discriminator** exists today. Segmentation is by `exam_name`/track (`selected_track`, `enabled_exams_in_track`) and optional `organization_id` (B2B institutes).
- B2B roles: `user_organization_memberships.role` — **`check (role in ('student','faculty','admin','parent'))`** (`supabase/migrations/20260527120000_add_multi_tenancy.sql`). Adding `rep`/`manager` requires **ALTERing this CHECK constraint**.
- `prepbrain_conversations` already has `organization_id` (multi-tenancy migration) — reusable for vertical/org scoping.
- Platform admin: `admin_users` allowlist + service-role reads (app-layer, not Postgres RBAC).
- RLS is pervasive (own-row `auth.uid() = user_id`, parent-FK subqueries, org scoping via `get_org_id_from_jwt()`, deny-all service-only tables). **RLS never sees the request host** — see §6.

## 5. `.rpc(` inventory (verified) — vertical-relevance flagged

These bypass any app-layer query helper and (when called with the service-role client) bypass RLS too. **Vertical filtering for these must live INSIDE the SQL function.**

Vertical-relevant (need `p_vertical` arg + `WHERE vertical = p_vertical`):
- `match_prepbrain_user_context` — `src/lib/prepbrainEmbeddings.ts` (service-role, untyped) ← primary Coach/RAG leak risk
- `prepbrain_marks_intelligence` — `src/lib/prepbrainToolQueries.ts:490`
- `recompute_leaderboard_weekly_top_percents` — `src/app/api/cron/refresh-leaderboard-snapshots/route.ts:141`
- `upsc_cse_mains_syllabus_rows` — `src/lib/syllabusMasterQuery.ts:37` (exam content; Kalnehi-only by nature)
- `prepbrain_ai_token_reserve` / `_finalize` / `_cancel_reservation` — `src/lib/prepbrainAiTokenRpc.ts`; `prepbrain_ai_token_sweep_expired` — cron sweep

Non-vertical infra RPCs (no per-vertical data, but listed for completeness): `auth_rate_limit_step`, `auth_rate_limit_password_reset` (`src/lib/authRateLimit.ts`); `assign_waitlist_position`, `activate_waitlist_skip` (waitlist routes); `attach_referral_to_user` (`src/actions/referral.ts`); `increment_user_app_active_seconds` (`src/app/api/activity/active-time/route.ts`); `try_consume_automated_push_budget` / `refund_automated_push_budget` (`src/lib/fcm/pushRateLimit.ts`); `add_ai_study_partner_seconds` / `deduct_ai_study_partner_seconds` (`src/actions/subscription.ts`, `src/actions/aiStudyPartner.ts`); `consume_welcome_trial_photo_scan` (`src/actions/subscription.ts`); `fetch_task_sessions_for_log` (`src/actions/taskSessions.ts`); `admin_active_time_summary` (`src/lib/admin/queries/engagementQueries.ts`); trial-queue RPC (`src/app/api/cron/activate-trial-queue/route.ts`); various admin summary RPCs in `src/lib/admin/queries/*`.

Service-role usage (bypasses RLS) spans ~110 files incl. `scripts/*.mjs`, all `src/app/api/cron/*`, `src/lib/admin/queries/*`, B2B actions, webhooks, and `src/proxy.ts`. Each must be individually checked for vertical scoping when FIZAKI data lands in shared tables.

## 6. Critical isolation finding (carried into REFRACTOR_PLAN)

**RLS is not the vertical firewall.** RLS only knows `auth.uid()`, never which domain served the request. Therefore vertical isolation MUST be enforced at the app/query layer (`withVertical` helper) plus inside SQL functions for RPC paths, with RLS retained for row ownership only. The `match_prepbrain_user_context` service-role call is the concrete live leak path if vertical filtering is added only in app code.

## 7. Golden-master parity targets (must be captured BEFORE extraction)

Exam edge cases that exercise the math to be extracted (`OutcomeMetric`, projections, `GapPlanner`, rollup):
- NEET 720 ceiling, multi-year marks (2023–2026), chapter all-or-nothing — `src/lib/syllabusRollup.ts`, `syllabusConstants.ts`
- UPSC Mains 2350 scale, optional subjects, qualifying papers — `src/lib/upscMainsOptionalSubjects.ts`
- CUET domain subjects filter — `src/lib/cuetDomainSubjects.ts`
- Multi-exam tracks — `src/lib/examTracks.ts`, existing `src/lib/syllabusRollup.multiExam.test.ts`
- Rank bands — `src/lib/rankPrediction.ts`, `exam_score_rank_bands`
- Edge: empty progress, partial chapters, per-user marks overrides (`applySyllabusMarksOverrides.ts`), custom syllabus rows.

## 8. Verification status of audit assumptions

All assumptions named in the program brief were grep/Read-verified: `match_prepbrain_user_context` ✅, `aiChatClient.ts` failover ✅, `useVoiceSttRouting.ts` ✅, `user_organization_memberships.role` ✅ (with CHECK-constraint caveat). Two corrections surfaced and are reflected above: (a) the role CHECK must be ALTERed to add `rep`/`manager`; (b) `prepbrain_conversations` already has `organization_id`. The `.rpc(` list in §5 was re-derived by grep, not assumed.
