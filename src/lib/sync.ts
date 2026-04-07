"use client";

import { createTask, deleteTask, updateTask } from "@/actions/tasks";
import { createTaskSession } from "@/actions/taskSessions";
import { formatSupabaseError, getSupabaseBrowserClient } from "@/lib/supabase";
import { dispatchTasksSync } from "@/lib/taskRefreshDispatch";
import { refreshExecutionLogFromServer } from "@/lib/refreshExecutionLog";
import { refreshStudySessionsFromServer } from "@/lib/refreshStudySessionsFromServer";
import { refreshTasksFromSupabase } from "@/lib/refreshTasksFromSupabase";
import {
  bumpOutboxFailCount,
  deleteOutboxMutation,
  getAllOutboxMutations,
  getOutboxCount,
  resetAllOutboxFailCounts,
  type OutboxMutation,
} from "@/lib/taskIdb";
import { USER_ERROR } from "@/lib/userFacingErrors";
import type { Json, TablesInsert } from "@/types/supabase";
import { useSyncStore } from "@/store/useSyncStore";

const MAX_RETRIES = 6;
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_MAX_MS = 60_000;

let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let offlineRecoverTimer: ReturnType<typeof setTimeout> | null = null;

/** Batches rapid outbox writes (planner typing) into one flush pass. */
let flushDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let flushDebounceUserId: string | undefined;

const OUTBOX_FLUSH_DEBOUNCE_MS = 55;

/**
 * Schedule a flush shortly — coalesces bursts of task/syllabus mutations so the
 * UI does not pay one full round-trip per keystroke.
 */
export function scheduleOutboxFlush(userId: string | undefined): void {
  if (!userId || typeof window === "undefined") return;
  flushDebounceUserId = userId;
  if (flushDebounceTimer) clearTimeout(flushDebounceTimer);
  flushDebounceTimer = setTimeout(() => {
    flushDebounceTimer = null;
    const uid = flushDebounceUserId;
    void flushOutbox(uid);
  }, OUTBOX_FLUSH_DEBOUNCE_MS);
}

/** Inserts a voice_timeline_entries row with the browser Supabase session (outbox flush). */
async function applyVoiceTimelineCreate(
  row: NonNullable<OutboxMutation["voiceInsert"]>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }
    const { error } = await supabase.from("voice_timeline_entries").insert({
      ...row,
      user_id: user.id,
    });
    if (!error) return { ok: true };
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: formatSupabaseError(error) };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

async function applyVoiceTimelineUpdate(
  id: string,
  patch: NonNullable<OutboxMutation["voicePatch"]>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }
    const { error } = await supabase
      .from("voice_timeline_entries")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: formatSupabaseError(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

async function applyHandwrittenPlannerReplace(
  payload: NonNullable<OutboxMutation["handwrittenReplace"]>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }

    const logDate = payload.log_date?.trim() ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
      return { ok: false, error: "Invalid date." };
    }

    const sourceText = (payload.source_text ?? "").trim().slice(0, 30_000);
    const cleaned = payload.tasks
      .map((t) => ({
        activityName: String(t.activityName ?? "")
          .trim()
          .slice(0, 200),
        start_time: t.start_time?.trim() || null,
        end_time: t.end_time?.trim() || null,
        duration: t.duration?.trim() || null,
      }))
      .filter((t) => t.activityName.length > 0);

    const { error: delErr } = await supabase
      .from("handwritten_planner_entries")
      .delete()
      .eq("user_id", user.id)
      .eq("log_date", logDate);

    if (delErr) return { ok: false, error: formatSupabaseError(delErr) };

    if (cleaned.length === 0) return { ok: true };

    const rows: TablesInsert<"handwritten_planner_entries">[] = cleaned.map(
      (t) => ({
        user_id: user.id,
        log_date: logDate,
        source_text: sourceText,
        title: t.activityName,
        start_time: t.start_time,
        end_time: t.end_time,
        duration: t.duration,
        parsed_json: {
          activityName: t.activityName,
          start_time: t.start_time,
          end_time: t.end_time,
          duration: t.duration,
          source: "paste_handwritten_plan",
          planner_include: true,
        } as Json,
      }),
    );

    const { error } = await supabase
      .from("handwritten_planner_entries")
      .insert(rows);

    if (error) return { ok: false, error: formatSupabaseError(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

async function applyVoiceTimelineDelete(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }
    const { error } = await supabase
      .from("voice_timeline_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: formatSupabaseError(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

/**
 * Study sessions must sync with the same Supabase session as the UI.
 * Server actions use cookie-backed `createSupabaseServerClient()`; if cookies
 * lag behind the browser session, inserts fail with Unauthorized. Outbox flush
 * runs only on the client, so we insert via `getSupabaseBrowserClient()`.
 */
async function applyStudySessionCreate(
  row: NonNullable<OutboxMutation["studySessionInsert"]>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }
    const { error } = await supabase.from("study_sessions").insert({
      id: row.id,
      user_id: user.id,
      subject: row.subject,
      duration_seconds: row.duration_seconds,
      is_camera_proven: row.is_camera_proven ?? false,
      started_at: row.started_at,
      ended_at: row.ended_at,
    });
    if (!error) return { ok: true };
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: formatSupabaseError(error) };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

function clearRetryTimer() {
  if (retryTimer != null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

async function applyOne(
  m: OutboxMutation,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (m.op === "task_update" && m.patch) {
    return updateTask(m.taskId, m.patch);
  }
  if (m.op === "task_delete") {
    return deleteTask(m.taskId);
  }
  if (m.op === "task_create" && m.insert) {
    return createTask(m.insert);
  }
  if (m.op === "task_session_create" && m.sessionInsert) {
    return createTaskSession(m.sessionInsert);
  }
  if (m.op === "study_session_create" && m.studySessionInsert) {
    return applyStudySessionCreate(m.studySessionInsert);
  }
  if (m.op === "voice_timeline_create" && m.voiceInsert) {
    return applyVoiceTimelineCreate(m.voiceInsert);
  }
  if (m.op === "voice_timeline_update" && m.voicePatch) {
    return applyVoiceTimelineUpdate(m.taskId, m.voicePatch);
  }
  if (m.op === "voice_timeline_delete") {
    return applyVoiceTimelineDelete(m.taskId);
  }
  if (m.op === "handwritten_planner_replace" && m.handwrittenReplace) {
    return applyHandwrittenPlannerReplace(m.handwrittenReplace);
  }
  return { ok: false, error: "Invalid outbox entry" };
}

function scheduleRetry(userId: string, attemptsSoFar: number) {
  clearRetryTimer();
  const delay = Math.min(
    BACKOFF_BASE_MS * 2 ** Math.min(attemptsSoFar, 8),
    BACKOFF_MAX_MS,
  );
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushOutbox(userId);
  }, delay);
}

function abortAfter(ms: number): AbortSignal {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

/**
 * Real reachability check: `navigator.onLine` is often wrong (sleep/VPN/Chromium).
 * Query-bust so the service worker cache-first handler cannot mask a dead network.
 */
async function probeSameOriginReachable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const paths = ["/manifest.webmanifest", "/offline.html"];
  for (const path of paths) {
    try {
      const u = new URL(path, window.location.origin);
      u.searchParams.set("_kalnehi_net", String(Date.now()));
      const res = await fetch(u.href, {
        method: "GET",
        cache: "no-store",
        signal: abortAfter(5000),
      });
      if (res.ok) return true;
    } catch {
      /* try next path */
    }
  }
  return false;
}

/**
 * Align UI + flush with actual connectivity. Call on init, visibility, focus,
 * and shortly after a spurious `offline` event.
 */
export async function reconcileConnectivity(
  userId: string | undefined,
): Promise<void> {
  if (typeof window === "undefined") return;

  if (navigator.onLine) {
    useSyncStore.getState().setOnline(true);
    if (userId) void flushOutbox(userId);
    return;
  }

  const reachable = await probeSameOriginReachable();
  useSyncStore.getState().setOnline(reachable);
  if (reachable && userId) void flushOutbox(userId);
}

/**
 * Push queued IndexedDB mutations to Supabase.
 * - Processes every entry (does NOT stop on the first failure).
 * - Skips entries that exceeded MAX_RETRIES (dead-lettered).
 * - Reports the worst-case error to useSyncStore so the banner can show it.
 * - Schedules an automatic retry with exponential backoff when entries remain.
 */
export async function flushOutbox(userId: string | undefined): Promise<void> {
  if (!userId || flushing) return;
  // Do not gate on navigator.onLine — it is unreliable and blocked sync while users were online.

  flushing = true;
  clearRetryTimer();

  try {
    const queue = await getAllOutboxMutations();
    if (queue.length === 0) {
      useSyncStore.getState().setPendingCount(0);
      useSyncStore.getState().setLastSyncError(null);
      return;
    }

    let processed = 0;
    let failedThisRound = 0;
    let deadLettered = 0;
    let worstFailCount = 0;
    let voicePlannerOpsApplied = 0;
    let handwrittenPlannerOpsApplied = 0;

    for (const m of queue) {
      const fails = m.failCount ?? 0;

      if (fails >= MAX_RETRIES) {
        deadLettered++;
        continue;
      }

      try {
        const res = await applyOne(m);

        if (res.ok) {
          await deleteOutboxMutation(m.clientMutationId);
          processed++;
          useSyncStore.getState().setPendingCount(await getOutboxCount());
          if (
            m.op === "voice_timeline_create" ||
            m.op === "voice_timeline_update" ||
            m.op === "voice_timeline_delete"
          ) {
            voicePlannerOpsApplied++;
          }
          if (m.op === "handwritten_planner_replace") {
            handwrittenPlannerOpsApplied++;
          }
        } else {
          await bumpOutboxFailCount(m.clientMutationId);
          failedThisRound++;
          worstFailCount = Math.max(worstFailCount, fails + 1);
          console.warn(
            `[sync] entry ${m.op} ${m.taskId} failed (attempt ${fails + 1}):`,
            res.error,
          );
        }
      } catch (err) {
        await bumpOutboxFailCount(m.clientMutationId);
        failedThisRound++;
        worstFailCount = Math.max(worstFailCount, fails + 1);
        console.warn(
          `[sync] entry ${m.op} ${m.taskId} threw (attempt ${fails + 1}):`,
          err,
        );
      }
    }

    const remaining = await getOutboxCount();
    useSyncStore.getState().setPendingCount(remaining);

    if (deadLettered > 0) {
      useSyncStore
        .getState()
        .setLastSyncError(
          `${deadLettered} change${deadLettered > 1 ? "s" : ""} couldn't sync after several attempts. Tap retry or check your connection.`,
        );
    } else if (failedThisRound > 0 && remaining > 0) {
      useSyncStore.getState().setLastSyncError(null);
      scheduleRetry(userId, worstFailCount);
    } else {
      useSyncStore.getState().setLastSyncError(null);
    }

    if (processed > 0) {
      useSyncStore.getState().touchQuietSync();
      await Promise.all([
        refreshTasksFromSupabase(userId),
        refreshExecutionLogFromServer(),
        refreshStudySessionsFromServer(),
      ]).catch(() => {});
      dispatchTasksSync();
    }
    if (
      voicePlannerOpsApplied > 0 &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("kalnehi-voice-planner-synced"));
    }
    if (
      handwrittenPlannerOpsApplied > 0 &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("kalnehi-handwritten-planner-synced"));
    }
  } finally {
    flushing = false;
  }
}

/**
 * Force-retry: reset all dead-lettered entries so they get another round.
 */
export async function retryDeadLettered(): Promise<void> {
  await resetAllOutboxFailCounts();
  useSyncStore.getState().setLastSyncError(null);
}

export function initSyncManager(userId: string | undefined): () => void {
  const onOnline = () => {
    if (offlineRecoverTimer) {
      clearTimeout(offlineRecoverTimer);
      offlineRecoverTimer = null;
    }
    useSyncStore.getState().setOnline(true);
    void flushOutbox(userId);
  };
  const onOffline = () => {
    useSyncStore.getState().setOnline(false);
    if (offlineRecoverTimer) clearTimeout(offlineRecoverTimer);
    offlineRecoverTimer = setTimeout(() => {
      offlineRecoverTimer = null;
      void reconcileConnectivity(userId);
    }, 2000);
  };

  if (typeof window === "undefined") {
    return () => {};
  }

  useSyncStore.getState().setOnline(navigator.onLine);
  void getOutboxCount().then((n) => useSyncStore.getState().setPendingCount(n));
  void reconcileConnectivity(userId);

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      void reconcileConnectivity(userId);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onFocus = () => {
    void reconcileConnectivity(userId);
  };
  window.addEventListener("focus", onFocus);

  if (userId) {
    void flushOutbox(userId);
  }

  return () => {
    clearRetryTimer();
    if (flushDebounceTimer) {
      clearTimeout(flushDebounceTimer);
      flushDebounceTimer = null;
    }
    if (offlineRecoverTimer) {
      clearTimeout(offlineRecoverTimer);
      offlineRecoverTimer = null;
    }
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onFocus);
  };
}
