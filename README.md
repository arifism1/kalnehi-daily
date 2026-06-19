# Kalnehi Daily

Next.js 16 (App Router) PWA for exam prep planning: syllabus tracking, voice, AI study partner (Mastermind), subscriptions (Razorpay), and push (FCM). Auth and data are backed by **Supabase** (Postgres + Auth).

## Prerequisites

- **Node.js** — use a current LTS (the repo targets TypeScript/`@types/node` **20**; align with your Vercel project runtime if deploying there).
- **npm** (or compatible client).

## Quick start

1. Clone the repository and `cd` into it.
2. Copy environment template: `cp .env.example .env.local`
3. Fill at least **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, and (for server features) **`SUPABASE_SERVICE_ROLE_KEY`**. Add optional keys from `.env.example` for AI, Razorpay, FCM, Resend, etc.
4. `npm install`
5. `npm run dev` — open [http://localhost:3000](http://localhost:3000)

For architecture, auth, proxy behavior, cron, and troubleshooting, use **[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)**.

## Documentation map

| Doc | Purpose |
| --- | --- |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | End-to-end engineering: routes, `proxy.ts`, Supabase session, trial/billing, cron, AI APIs |
| [.env.example](.env.example) | Environment variables with inline setup notes |
| [SAFETY.md](SAFETY.md) | Branch / backup workflow before large changes |
| [SEO_ENVIRONMENT_GUIDE.md](SEO_ENVIRONMENT_GUIDE.md) | Canonical URLs, sitemaps, GSC alignment |
| [GSC_DIAGNOSTICS_GUIDE.md](GSC_DIAGNOSTICS_GUIDE.md) | Manual + automated canonical checks |
| [GSC_API_SETUP.md](GSC_API_SETUP.md) | Search Console API automation |
| [CHECKLIST.md](CHECKLIST.md) | SEO rollout checklist |
| [docs/android-device-qa-matrix.md](docs/android-device-qa-matrix.md) | Capacitor / Android voice, push, billing checks |
| [docs/EXTERNAL_SSD_DEV.md](docs/EXTERNAL_SSD_DEV.md) | SSD volume layout, `npm ci`, Android SDK paths, sibling apps |

## Multi-vertical (Kalnehi + FIZAKI)

One codebase serves two brands on two domains. The active **vertical** is resolved from the
request **host** by `proxy.ts` (`www.kalnehi.com` → `kalnehi`, `www.fizaki.in` → `fizaki`)
and passed to server components via the `x-vertical` header. Branding, copy, feature flags,
and roles all come from each `VerticalConfig` in `src/verticals/`.

- **Engine vs. vertical**: domain-agnostic business logic lives in `src/engine/**` (imported
  via `@engine/*`, enforced by an ESLint boundary). Verticals are thin adapters/config.
- **Deploy**: create **two Vercel projects from the same repo**, one per domain. Host
  resolution is the source of truth; set `NEXT_PUBLIC_VERTICAL` per project only as a
  fallback for previews/local. Separate projects also give each brand its own cache
  namespace, so a cached page can't serve the wrong brand.
- **Auth**: shared Supabase project; cookies are domain-scoped so sessions don't bleed
  across brands. Add **both** `/auth/callback` origins to the Supabase redirect allowlist
  (see `.env.example`).
- **Data isolation**: shared tables carry a `vertical` discriminator (migration
  `supabase/migrations/20260821120000_vertical_discriminator.sql`); reads/writes go through
  the `withVertical` helpers, and the PrepBrain RPC is vertical-scoped. RLS still enforces
  row ownership. Apply the **additive** migration first; defer the `NOT NULL` follow-up until
  the app stamps `vertical` everywhere.
- **Demo without a DB**: the FIZAKI buyer-core surfaces (import, pipeline, manager dashboard)
  run on in-memory seed data. Use `NEXT_PUBLIC_FIZAKI_DEMO_ROLE` to preview rep/manager/admin
  views without real org memberships (leave it unset in production).

## Common commands

| Command | Description |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run verify:fcm` | FCM setup verification |
| `npm run verify:notification-tap` | Notification tap routing |
| `npm run verify:razorpay-sub` | Razorpay subscription counts |
| `npm run verify:razorpay-pricing` | Razorpay pricing env |
| `npm run verify:autopay-pricing` | Autopay pricing totals |
| `npm run verify:api-pii` | Public API PII check |
| `npm run verify:supabase-security` | Supabase security checks |
| `npm run verify:service-role` | Service role scope |
| `npm run verify:dast-staging` | DAST staging hints |
| `npm run verify:security` | Audit + Supabase + service-role + DAST hints |
| `npm run generate:pwa-assets` | Rebuild PWA icons + iOS splashes + Android launcher mipmaps when `android/app/src/main/res` exists; otherwise skips Android and still refreshes web assets. Use `npm run generate:icons` for icons only (no splashes). |
| `npm run test:rollup` | Syllabus rollup tests |
| `npm run test:leaderboard` | Leaderboard tests |
| `npm run test:prepbrain` | PrepBrain / Mastermind routing tests |
| `npm run test:doubt-voice` | Doubt voice wiring tests |
| `npm run test:voice-quota-wiring` | Voice quota wiring tests |
| `npm run test:vertical` | Vertical config + host resolution + no-wording-leakage |
| `npm run test:fizaki` | FIZAKI buyer-core logic (structurer, ramp, quota-gap) |

Database migrations live under `supabase/migrations/`. Apply with Supabase CLI (`npx supabase db push`) or run SQL in the dashboard as described in `.env.example`.
