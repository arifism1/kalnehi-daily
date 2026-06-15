/**
 * Single cron dispatcher.
 *
 * A GitHub Actions workflow (`.github/workflows/cron.yml`) pings this endpoint
 * every 5 minutes with `Authorization: Bearer <CRON_SECRET>`. The dispatcher
 * reads each registered job's last-run marker from Redis, determines which jobs
 * are due, records the new marker, and fans out (in the background, via
 * `after()`) to the existing `/api/cron/*` handlers using the same bearer token.
 *
 * This replaces the per-job `crons` array in `vercel.json`, allowing the project
 * to run on the Vercel Hobby tier (which permits only once-per-day crons).
 *
 * Required env: `CRON_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, and a
 * production origin (`NEXT_PUBLIC_SITE_URL`, used by `getSiteUrl()`).
 */
import { Redis } from "@upstash/redis";
import { after, type NextRequest, NextResponse } from "next/server";

import {
  DAILY_JOBS,
  INTERVAL_JOBS,
  isDailyDue,
  isIntervalDue,
  lastRunKey,
  utcYmd,
} from "@/lib/cron/registry";
import { createRouteLogger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 300;

const log = createRouteLogger("cron/tick");

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/** Fan out to a single job handler, reusing the cron bearer token. */
async function triggerJob(base: string, path: string, secret: string): Promise<void> {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) {
      log.error("job trigger non-2xx", undefined, { path, status: res.status });
    }
  } catch (err) {
    log.error("job trigger failed", err, { path });
  }
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const redis = getRedis();
  if (!redis) {
    log.error("Redis unavailable (KV_REST_API_URL/KV_REST_API_TOKEN)");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const now = new Date();
  const nowMs = now.getTime();
  const today = utcYmd(now);

  // Read all last-run markers in one round trip.
  const intervalKeys = INTERVAL_JOBS.map((j) => lastRunKey(j.id));
  const dailyKeys = DAILY_JOBS.map((j) => lastRunKey(j.id));
  const [intervalMarkers, dailyMarkers] = await Promise.all([
    intervalKeys.length ? redis.mget<(number | null)[]>(...intervalKeys) : Promise.resolve([]),
    dailyKeys.length ? redis.mget<(string | null)[]>(...dailyKeys) : Promise.resolve([]),
  ]);

  const due: { id: string; path: string }[] = [];
  const markers: Record<string, number | string> = {};

  INTERVAL_JOBS.forEach((job, i) => {
    const last = intervalMarkers[i] ?? null;
    if (isIntervalDue(job, last, nowMs)) {
      due.push({ id: job.id, path: job.path });
      markers[lastRunKey(job.id)] = nowMs;
    }
  });

  DAILY_JOBS.forEach((job, i) => {
    const last = dailyMarkers[i] ?? null;
    if (isDailyDue(job, last, now)) {
      due.push({ id: job.id, path: job.path });
      markers[lastRunKey(job.id)] = today;
    }
  });

  // Record markers up front so overlapping ticks don't double-fire. The job
  // handlers are individually idempotent (dedupe), so this is the safe default.
  if (Object.keys(markers).length > 0) {
    await redis.mset(markers);
  }

  const base = getSiteUrl();
  if (due.length > 0) {
    after(async () => {
      await Promise.allSettled(due.map((j) => triggerJob(base, j.path, secret)));
    });
  }

  log.info("tick", { triggered: due.map((j) => j.id), count: due.length });

  return NextResponse.json({
    ok: true,
    now: now.toISOString(),
    triggered: due.map((j) => j.id),
    count: due.length,
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}
