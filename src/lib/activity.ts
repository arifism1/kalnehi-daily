/**
 * Client-side activity tracking library.
 *
 * Usage:
 *   trackActivity("task_created", { feature: "tasks", metadata: { source: "daily_plan" } });
 *
 * Events are buffered in memory and flushed:
 *   - every FLUSH_INTERVAL_MS milliseconds
 *   - when the document becomes hidden (tab switch / phone lock)
 *   - on beforeunload
 *
 * The ActivityTracker component manages the flush lifecycle.
 * This module is safe to import in any client component.
 */

export type ActivityPlatform = "web" | "ios_pwa" | "android_pwa";

export type ActivityEvent = {
  page: string;
  feature?: string;
  action: string;
  metadata?: Record<string, unknown>;
  platform: ActivityPlatform;
  session_id: string;
  ts: number; // epoch ms, converted to ISO on flush
};

export const FLUSH_INTERVAL_MS = 30_000;
const SESSION_KEY = "kal_activity_session_id";
const MAX_BUFFER = 50;

// Module-level buffer — shared across all components.
const buffer: ActivityEvent[] = [];
let flushInFlight = false;

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return generateId();
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateId();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Resolve the current platform from the navigator at call time. */
export function resolvePlatform(): ActivityPlatform {
  if (typeof window === "undefined") return "web";
  const isStandalone =
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches;
  if (!isStandalone) return "web";
  return /iP(hone|ad|od)/i.test(navigator.userAgent) ? "ios_pwa" : "android_pwa";
}

/**
 * Queue an activity event. Safe to call from any client component.
 * Does nothing on the server.
 */
export function trackActivity(
  action: string,
  opts?: {
    feature?: string;
    metadata?: Record<string, unknown>;
    page?: string;
    task_id?: string;
    task_title?: string;
  },
): void {
  if (typeof window === "undefined") return;
  if (buffer.length >= MAX_BUFFER) return; // drop if overfull (flush lag)

  const taskMeta: Record<string, unknown> = {};
  if (opts?.task_id !== undefined) taskMeta.task_id = opts.task_id;
  if (opts?.task_title !== undefined) taskMeta.task_title = opts.task_title;
  const mergedMetadata =
    opts?.metadata !== undefined || Object.keys(taskMeta).length > 0
      ? { ...opts?.metadata, ...taskMeta }
      : undefined;

  buffer.push({
    page: opts?.page ?? window.location.pathname,
    feature: opts?.feature,
    action,
    metadata: mergedMetadata,
    platform: resolvePlatform(),
    session_id: getSessionId(),
    ts: Date.now(),
  });
}

/** Returns current buffer length — used by ActivityTracker for logging. */
export function getBufferSize(): number {
  return buffer.length;
}

/** Flush buffered events to /api/activity/track. Idempotent if already in flight. */
export async function flushActivity(): Promise<void> {
  if (flushInFlight || buffer.length === 0) return;
  flushInFlight = true;

  const batch = buffer.splice(0, MAX_BUFFER);
  try {
    const payload = batch.map((e) => ({
      page: e.page,
      feature: e.feature ?? null,
      action: e.action,
      metadata: e.metadata ?? {},
      platform: e.platform,
      session_id: e.session_id,
      created_at: new Date(e.ts).toISOString(),
    }));

    await fetch("/api/activity/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: payload }),
      keepalive: true, // works across beforeunload
    });
  } catch {
    // Re-queue on network error (best-effort; no infinite retry).
    buffer.unshift(...batch);
  } finally {
    flushInFlight = false;
  }
}
