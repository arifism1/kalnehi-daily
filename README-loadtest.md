# k6 load testing (Kalnehi Daily)

Load scripts live at the repo root: [`loadtest.js`](loadtest.js) (gradual ramp) and [`loadtest-spike.js`](loadtest-spike.js) (traffic spike). They target **Next.js API routes** backed primarily by **Supabase** (Postgres + Auth), with optional use of Upstash Redis, Firebase (FCM), and Vercel Edge Config.

---

## Before you hit run

| Check | Why |
| --- | --- |
| Run against **staging**, not production | 200 VUs on prod affects real users |
| **Do not** set `K6_CRON_SECRET` on shared or production environments | Cron routes run heavy jobs (e.g. **real push notifications**) |
| **Do not** set `K6_ADMIN_SESSION_COOKIE` unless you accept **real admin data** exposure | Admin APIs can read or change operational data |
| **Dry run** at **1 VU** first | Confirms the script runs before scaling |
| After the dry run, before **10+ VUs**: Supabase **Dashboard → Database → Connection pooling** | Confirm pooling is **enabled**; the **transaction** pooler uses port **6543** (direct Postgres is typically **5432**). Catches connection-limit misconfiguration early |
| Optionally cap at **10 VUs** before the full ramp | e.g. `k6 run --vus 10 --duration 2m loadtest.js` (CLI overrides script stages) |
| Know your **Supabase plan** (free tier is roughly **~20** DB connections) | Concurrent serverless + DB work exhausts limits quickly |

---

## Install k6

- **macOS**: `brew install k6`
- **Other platforms**: [k6 installation docs](https://grafana.com/docs/k6/latest/set-up/install-k6/)

---

## Recommended run order

```bash
# 1. Dry run — 1 VU, catch script errors
BASE_URL=https://your-staging-url k6 run --vus 1 --duration 30s loadtest.js

# 2. Full ramp (built-in stages 10 → 50 → 100 → 200)
BASE_URL=https://your-staging-url k6 run loadtest.js

# 3. Only after (2) passes — spike test
BASE_URL=https://your-staging-url k6 run loadtest-spike.js
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `BASE_URL` | **Yes** for real runs | Origin only, no trailing slash (e.g. `https://staging.example.com`) |
| `K6_SESSION_COOKIE` | No | Full `Cookie` header value from a **staging** signed-in browser session (Supabase SSR cookies). Enables authenticated GETs (`/api/feature-flags`, `/api/user/custom-reminders`, `/api/prepbrain/usage`, `/api/user/system-push`). |
| `K6_ADMIN_SESSION_COOKIE` | No | Same idea for an **admin** session; only triggers **GET** `/api/admin/daily-cap`. Avoid on production. |
| `K6_CRON_SECRET` | No | **Avoid.** If set, calls **GET** `/api/cron/reset-ai-tokens` with `Authorization: Bearer …`. Cron routes can have serious side effects. |

Example with session cookie:

```bash
BASE_URL=https://your-staging-url \
K6_SESSION_COOKIE='sb-xxxx-auth-token=...' \
k6 run loadtest.js
```

---

## What the scripts hit

**Always (each iteration):**

- `GET /api/app-status`
- `GET /api/digital-asset-links`
- `GET /api/fcm/capabilities`
- `GET /api/og?type=default&title=LoadTest&subtitle=k6`
- `POST /api/referral/event` (minimal JSON; still writes via backend — prefer staging)

**If `K6_SESSION_COOKIE` is set:**

- `GET /api/feature-flags`
- `GET /api/user/custom-reminders`
- `GET /api/prepbrain/usage`
- `GET /api/user/system-push`

**If `K6_ADMIN_SESSION_COOKIE` is set:** `GET /api/admin/daily-cap`

**If `K6_CRON_SECRET` is set:** `GET /api/cron/reset-ai-tokens` (not recommended)

Payment, waitlist, webhooks, contact-support, and LLM-heavy routes are **not** included by default.

Between requests the script sleeps **1–2 seconds** (random) to mimic pacing.

---

## Per-endpoint latency in the summary

Every `http.get` / `http.post` uses:

```js
tags: { name: 'GET_/api/app-status' }
```

In the k6 end summary, look for lines such as:

- `http_req_duration{name:GET_/api/feature-flags}`
- `http_req_duration{name:GET_/api/og}`
- `http_req_duration{name:POST_/api/referral/event}`

That shows **p95 / trends per endpoint**, not only the global aggregate. To tune displayed stats:

```bash
k6 run --summary-trend-stats="avg,min,med,max,p(90),p(95)" loadtest.js
```

---

## Metrics to watch

| Metric | What “bad” looks like |
| --- | --- |
| `http_req_failed` | Non-zero rate or threshold breach |
| `http_req_duration` (global and `name:{…}`) | **p95** consistently near or above **2 s** |
| HTTP **429** / **503** | Rate limits ([`src/proxy.ts`](src/proxy.ts)) or overload / maintenance |
| **checks** failures | Wrong status (expects **200**) or duration ≥ **2000 ms** per check |
| Supabase / DB errors in app logs | Connection exhaustion, timeouts |

---

## Slow results at 1 VU

With **one virtual user**, a **high global p95** (for example ~1.3 s) usually reflects **one expensive request** in the iteration, not aggregate overload.

- Read **per-endpoint** lines in the summary, e.g. **`http_req_duration{name:GET_/api/og}`** vs **`GET_/api/app-status`**, **`POST_/api/referral/event`**, and auth routes. If **`GET_/api/og`** is much slower than the rest, that matches **CPU-heavy** Open Graph image generation ([`src/app/api/og/route.tsx`](src/app/api/og/route.tsx) uses `ImageResponse`).
- **Vercel** serverless **cold starts** can inflate latency on early iterations. Run a second dry run or focus on **steady-state** per-tag p95 after warm-up.
- Enabling **connection pooling** (**6543**) helps **direct Postgres** usage and overall DB connection capacity; it **does not** remove OG rendering cost or cold-start spikes.

---

## Supabase: connections and pooling

- **Monitor usage**: Supabase Dashboard → **Reports** (or observability) → database **connections**.
- **Plan limits**: Free/small tiers have low **max connections**; many concurrent Next.js instances each talking to Postgres can exhaust them quickly under load.
- **Connection pooling UI**: Supabase Dashboard → **Database** → **Connection pooling**. Confirm pooling is **enabled**. Use the **transaction** pooler on port **6543** for **many short-lived** clients (typical serverless). Direct Postgres connections typically use port **5432**. Supabase exposes this via **Supavisor** (pooler).
- **This app**: Route handlers mostly use the **Supabase HTTP API** (`@supabase/supabase-js`), not raw Postgres from k6 — but heavy routes still drive query load and connection usage on the database side.
- If jobs or scripts use the **direct** Postgres URL (**5432**), switch those workloads to the **pooled** URL (**6543**, transaction mode) where appropriate.

---

## Auth note

These API routes expect a **cookie-based** Supabase session set by the SSR client, not a bare `Authorization: Bearer` JWT attached by k6. Copy the **`Cookie`** header from DevTools for an authenticated request to your staging origin (e.g. `/api/feature-flags`) into `K6_SESSION_COOKIE`.

---

## Optional: fixed 10 VU smoke before full ramp

CLI flags override the script’s `stages`, so you can hold **10 VUs** for **2 minutes** without editing the file:

```bash
BASE_URL=https://your-staging-url k6 run --vus 10 --duration 2m loadtest.js
```
