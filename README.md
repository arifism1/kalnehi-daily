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
| `npm run generate:pwa-assets` | PWA asset rebuild |
| `npm run test:rollup` | Syllabus rollup tests |
| `npm run test:leaderboard` | Leaderboard tests |
| `npm run test:prepbrain` | PrepBrain / Mastermind routing tests |
| `npm run test:doubt-voice` | Doubt voice wiring tests |
| `npm run test:voice-quota-wiring` | Voice quota wiring tests |

Database migrations live under `supabase/migrations/`. Apply with Supabase CLI (`npx supabase db push`) or run SQL in the dashboard as described in `.env.example`.
