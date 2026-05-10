/**
 * PrepBrain Redis cache layer (Upstash REST).
 *
 * Sits between the in-memory 45s Map cache and Supabase to give cross-instance
 * persistence. At scale, Fluid Compute spins up many instances that each start
 * with an empty in-memory cache; Redis ensures they share warm data.
 *
 * Graceful degradation: if UPSTASH_REDIS_REST_URL / TOKEN are absent (local dev
 * or before Upstash is provisioned), every function is a no-op and the
 * in-memory cache handles the work transparently.
 *
 * Setup:
 *   1. Add Upstash Redis via Vercel Marketplace → get env vars automatically.
 *   2. Or set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN manually.
 */

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

try {
  // Vercel Marketplace provisions KV_REST_API_URL / KV_REST_API_TOKEN.
  // Also accept the canonical UPSTASH_* names for self-managed setups.
  const url =
    process.env.KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
  }
} catch {
  // Leave redis null — all functions degrade to no-ops.
}

/**
 * Per-tool TTLs in seconds.
 * Shorter for data that changes frequently during the day;
 * longer for catalog / user-set data that is rarely updated.
 */
const TOOL_TTL_SECONDS: Record<string, number> = {
  getTodayPlan: 120,              // 2 min — tasks complete throughout the day
  getSyllabusStats: 300,          // 5 min — shared prefetch for syllabus tools
  getSyllabusOverview: 300,       // 5 min
  getWeakStrongSubjects: 300,     // 5 min
  getHabitStreakSummary: 180,     // 3 min
  getMeditationConsistency: 180,  // 3 min
  getRecentStudyCameraData: 120,  // 2 min
  getTargetScoreBlueprint: 600,   // 10 min — user rarely changes target
  getMarksIntelligence: 600,      // 10 min — catalog data is stable
};

const DEFAULT_TTL_SECONDS = 180;
const KEY_VERSION = "v1";

function ttlSecondsForTool(tool: string): number {
  const base = tool.includes(":") ? tool.slice(0, tool.indexOf(":")) : tool;
  return TOOL_TTL_SECONDS[base] ?? TOOL_TTL_SECONDS[tool] ?? DEFAULT_TTL_SECONDS;
}

function cacheKey(userId: string, tool: string): string {
  return `pb:${userId}:${tool}:${KEY_VERSION}`;
}

/**
 * Fetch a cached tool result from Redis.
 * Returns `undefined` if Redis is not configured, key is missing, or any error occurs.
 */
export async function redisToolGet(
  userId: string,
  tool: string,
): Promise<unknown> {
  if (!redis) return undefined;
  try {
    const raw = await redis.get<unknown>(cacheKey(userId, tool));
    return raw ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Store a tool result in Redis with the appropriate per-tool TTL.
 * Silently ignores errors so a Redis outage never breaks the chat flow.
 */
export async function redisToolSet(
  userId: string,
  tool: string,
  value: unknown,
): Promise<void> {
  if (!redis) return;
  try {
    const ttl = ttlSecondsForTool(tool);
    await redis.set(cacheKey(userId, tool), value, { ex: ttl });
  } catch {
    // Silently ignore — in-memory cache still covers the session.
  }
}

/** True when Redis is configured and available. Useful for logging. */
export function isRedisConfigured(): boolean {
  return redis !== null;
}
