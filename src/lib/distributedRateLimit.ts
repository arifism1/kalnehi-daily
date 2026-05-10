import { Redis } from "@upstash/redis";

/**
 * Distributed sliding-window rate limiter backed by Upstash Redis.
 *
 * Replaces per-isolate in-memory Maps that do not survive cold starts or
 * scale across concurrent Vercel function instances.
 *
 * Pattern mirrors src/app/api/contact-support/route.ts but is extracted so
 * that proxy.ts and API routes share one implementation.
 *
 * Required env vars: KV_REST_API_URL, KV_REST_API_TOKEN
 * (same Upstash Redis instance already used by contact-support).
 */

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

/**
 * Check (and record) a request against a sliding-window rate limit.
 *
 * @param key      Unique bucket key (e.g. "rl:ip:1.2.3.4:/api/waitlist/join")
 * @param windowMs Window size in milliseconds
 * @param max      Maximum number of requests allowed in the window
 *
 * Returns `{ allowed: true }` on success, or `{ allowed: false, retryAfterMs }`
 * when the limit is exceeded.
 *
 * Falls back to ALLOW when Redis is unavailable so a misconfigured Redis does
 * not take the whole app offline. Log the miss so it is visible in monitoring.
 */
export async function distributedRateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    // Redis not configured — degrade gracefully (log once per cold start).
    console.warn(
      "[distributedRateLimit] KV_REST_API_URL/KV_REST_API_TOKEN not set; rate limit skipped for key:",
      key,
    );
    return { allowed: true };
  }

  const now = Date.now();
  const windowStart = now - windowMs;
  const windowS = Math.ceil(windowMs / 1000);
  const member = now.toString();

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, "-inf", windowStart);
    pipeline.zadd(key, { score: now, member });
    pipeline.zcount(key, windowStart, "+inf");
    pipeline.expire(key, windowS);

    const results = await pipeline.exec();
    const count = results[2] as number;

    if (count > max) {
      // Estimate how long until the oldest request falls out of the window.
      const retryAfterMs = windowMs;
      return { allowed: false, retryAfterMs };
    }
    return { allowed: true };
  } catch (err) {
    // Redis error — degrade gracefully rather than blocking the request.
    console.error("[distributedRateLimit] Redis error:", err instanceof Error ? err.message : err);
    return { allowed: true };
  }
}
