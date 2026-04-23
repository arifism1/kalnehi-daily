"use client";

import {
  createTask,
  createTasksBulk,
  deleteTask,
  updateTask,
} from "@/actions/tasks";
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
import { flushHabitOutbox } from "@/lib/habitSync";
import { flushMotivationOutbox } from "@/lib/motivationSync";
import {
  cancelPendingUserPlannerTextDebounce,
  flushUserPlannerTextOutbox,
} from "@/lib/userPlannerTextSync";
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
const TASK_CREATE_BATCH_SIZE = 12;
const TASK_CREATE_BATCH_PARALLEL = 3;

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

/** Clears task outbox debounce without flushing; pair with `flushOutbox`. */
export function cancelPendingTaskOutboxDebounce(): void {
  if (flushDebounceTimer) {
    clearTimeout(flushDebounceTimer);
    flushDebounceTimer = null;
  }
}

/**
 * Cancel debounced flushes and push all IndexedDB outboxes immediately.
 * Use on tab hide / pagehide so queued work is not stranded behind a timer.
 */
export function flushAllOutboxes(userId: string | undefined): void {
  cancelPendingTaskOutboxDebounce();
  cancelPendingUserPlannerTextDebounce();
  if (!userId) return;
  void flushOutbox(userId);
  void flushMotivationOutbox(userId);
  void flushHabitOutbox(userId);
  void flushUserPlannerTextOutbox(userId);
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

async function ensureBrowserDailyPlanId(
  planDate: string,
): Promise<{ ok: true; planId: string } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
      return { ok: false, error: "Invalid date." };
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("daily_plans")
      .upsert(
        {
          user_id: user.id,
          plan_date: planDate,
          updated_at: now,
        },
        { onConflict: "user_id,plan_date" },
      )
      .select("id")
      .single();
    if (error || !data?.id) {
      return { ok: false, error: formatSupabaseError(error) };
    }
    return { ok: true, planId: data.id };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

async function applyDailyTaskCreate(
  payload: NonNullable<OutboxMutation["dailyTaskInsert"]>,
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
    const ensured = await ensureBrowserDailyPlanId(payload.plan_date);
    if (!ensured.ok) return ensured;

    const { error } = await supabase.from("daily_tasks").insert({
      id: payload.id,
      daily_plan_id: ensured.planId,
      title: payload.title,
      time_slot: payload.time_slot,
      time_start: payload.time_start,
      time_end: payload.time_end,
      priority: payload.priority,
      status: payload.status,
      source: payload.source,
      source_raw_text: payload.source_raw_text,
      syllabus_master_id: payload.syllabus_master_id ?? null,
    });
    if (!error) return { ok: true };
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: formatSupabaseError(error) };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

async function applyDailyTaskUpdate(
  id: string,
  patch: NonNullable<OutboxMutation["dailyTaskPatch"]>,
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
      .from("daily_tasks")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { ok: false, error: formatSupabaseError(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

async function applyDailyTaskDelete(
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
    const { error } = await supabase.from("daily_tasks").delete().eq("id", id);
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
 * Study sessions sync through the server action so photo-scan quota is enforced
 * (camera-proven sessions share the same pool as handwritten scans).
 */
async function applyStudySessionCreate(
  row: NonNullable<OutboxMutation["studySessionInsert"]>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { createStudySession } = await import("@/actions/userStudySessions");
    const res = await createStudySession({
      id: row.id,
      subject: row.subject,
      duration_seconds: row.duration_seconds,
      is_camera_proven: row.is_camera_proven ?? false,
      started_at: row.started_at,
      ended_at: row.ended_at,
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: res.error };
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
  if (m.op === "daily_task_create" && m.dailyTaskInsert) {
    return applyDailyTaskCreate(m.dailyTaskInsert);
  }
  if (m.op === "daily_task_update" && m.dailyTaskPatch) {
    return applyDailyTaskUpdate(m.taskId, m.dailyTaskPatch);
  }
  if (m.op === "daily_task_delete") {
    return applyDailyTaskDelete(m.taskId);
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
    flushAllOutboxes(userId);
    return;
  }

  const reachable = await probeSameOriginReachable();
  useSyncStore.getState().setOnline(reachable);
  if (reachable) {
    flushAllOutboxes(userId);
  }
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
    let queue = await getAllOutboxMutations();
    if (queue.length === 0) {
      useSyncStore.getState().setPendingCount(0);
      useSyncStore.getState().setLastSyncError(null);
      return;
    }

    let processed = 0;
    let failedThisRound = 0;
    let deadLettered = 0;
    let worstFailCount = 0;
    let latestFailureMessage: string | null = null;
    let voicePlannerOpsApplied = 0;
    let dailyPlanOpsApplied = 0;
    let handwrittenPlannerOpsApplied = 0;
    let touchedTasks = false;
    let touchedExecution = false;
    let touchedStudy = false;

    const retryableTaskCreates = queue.filter(
      (m) => m.op === "task_create" && m.insert && (m.failCount ?? 0) < MAX_RETRIES,
    );

    const runTaskCreateBatch = async (batch: OutboxMutation[]) => {
      const inserts = batch
        .map((m) => m.insert)
        .filter((v): v is NonNullable<OutboxMutation["insert"]> => !!v);
      if (inserts.length === 0) return;
      try {
        const res = await createTasksBulk(inserts);
        if (res.ok) {
          for (const m of batch) {
            await deleteOutboxMutation(m.clientMutationId);
            processed++;
          }
          touchedTasks = true;
          return;
        }
        for (const m of batch) {
          const fails = m.failCount ?? 0;
          await bumpOutboxFailCount(m.clientMutationId);
          failedThisRound++;
          worstFailCount = Math.max(worstFailCount, fails + 1);
        }
        latestFailureMessage = res.error;
        console.log("[sync] task_create batch failed", {
          error: res.error,
          batchSize: batch.length,
          ids: batch.map((m) => m.taskId),
        });
      } catch (err) {
        const msg = formatSupabaseError(err);
        for (const m of batch) {
          const fails = m.failCount ?? 0;
          await bumpOutboxFailCount(m.clientMutationId);
          failedThisRound++;
          worstFailCount = Math.max(worstFailCount, fails + 1);
        }
        latestFailureMessage = msg;
        console.warn("[sync] task_create batch threw:", err);
      }
    };

    if (retryableTaskCreates.length > 0) {
      const batches: OutboxMutation[][] = [];
      for (let i = 0; i < retryableTaskCreates.length; i += TASK_CREATE_BATCH_SIZE) {
        batches.push(retryableTaskCreates.slice(i, i + TASK_CREATE_BATCH_SIZE));
      }
      for (let i = 0; i < batches.length; i += TASK_CREATE_BATCH_PARALLEL) {
        await Promise.all(
          batches
            .slice(i, i + TASK_CREATE_BATCH_PARALLEL)
            .map((b) => runTaskCreateBatch(b)),
        );
      }
    }

    // Successful bulk creates are removed from IDB. Re-fetch so the sequential
    // pass only sees remaining ops in createdAt order — including task_creates
    // the batch did not apply (retried with createTask via applyOne), so
    // task_session never runs before its task row exists.
    queue = await getAllOutboxMutations();

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
          if (m.op === "task_update" || m.op === "task_delete") touchedTasks = true;
          if (m.op === "task_session_create") touchedExecution = true;
          if (m.op === "study_session_create") touchedStudy = true;
          if (
            m.op === "voice_timeline_create" ||
            m.op === "voice_timeline_update" ||
            m.op === "voice_timeline_delete"
          ) {
            voicePlannerOpsApplied++;
          }
          if (
            m.op === "daily_task_create" ||
            m.op === "daily_task_update" ||
            m.op === "daily_task_delete"
          ) {
            dailyPlanOpsApplied++;
          }
          if (m.op === "handwritten_planner_replace") {
            handwrittenPlannerOpsApplied++;
          }
        } else {
          await bumpOutboxFailCount(m.clientMutationId);
          failedThisRound++;
          worstFailCount = Math.max(worstFailCount, fails + 1);
          latestFailureMessage = res.error;
          console.warn(
            `[sync] entry ${m.op} ${m.taskId} failed (attempt ${fails + 1}):`,
            res.error,
          );
          console.log("[sync] full mutation failure", {
            op: m.op,
            taskId: m.taskId,
            attempt: fails + 1,
            error: res.error,
            mutation: m,
          });
        }
      } catch (err) {
        const msg = formatSupabaseError(err);
        await bumpOutboxFailCount(m.clientMutationId);
        failedThisRound++;
        worstFailCount = Math.max(worstFailCount, fails + 1);
        latestFailureMessage = msg;
        console.warn(
          `[sync] entry ${m.op} ${m.taskId} threw (attempt ${fails + 1}):`,
          err,
        );
        console.log("[sync] full thrown mutation error", {
          op: m.op,
          taskId: m.taskId,
          attempt: fails + 1,
          error: msg,
          rawError: err,
          mutation: m,
        });
      }
    }

    const remaining = await getOutboxCount();
    useSyncStore.getState().setPendingCount(remaining);

    if (deadLettered > 0) {
      useSyncStore
        .getState()
        .setLastSyncError(
          latestFailureMessage ??
            `${deadLettered} change${deadLettered > 1 ? "s" : ""} couldn't sync after several attempts. Tap retry or check your connection.`,
        );
    } else if (failedThisRound > 0 && remaining > 0) {
      useSyncStore.getState().setLastSyncError(latestFailureMessage);
      scheduleRetry(userId, worstFailCount);
    } else {
      useSyncStore.getState().setLastSyncError(null);
    }

    if (processed > 0) {
      useSyncStore.getState().touchQuietSync();
      const refreshes: Promise<unknown>[] = [];
      if (touchedTasks) refreshes.push(refreshTasksFromSupabase(userId));
      if (touchedExecution) refreshes.push(refreshExecutionLogFromServer());
      if (touchedStudy) refreshes.push(refreshStudySessionsFromServer());
      await Promise.all(refreshes).catch(() => {});
      dispatchTasksSync();
    }
    if (dailyPlanOpsApplied > 0 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
      window.dispatchEvent(new Event("kalnehi-voice-planner-synced"));
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
    flushAllOutboxes(userId);
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
    } else {
      flushAllOutboxes(userId);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onFocus = () => {
    void reconcileConnectivity(userId);
  };
  window.addEventListener("focus", onFocus);

  const onPageHide = () => {
    flushAllOutboxes(userId);
  };
  window.addEventListener("pagehide", onPageHide);

  if (userId) {
    flushAllOutboxes(userId);
  }

  return () => {
    flushAllOutboxes(userId);
    clearRetryTimer();
    cancelPendingUserPlannerTextDebounce();
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
    window.removeEventListener("pagehide", onPageHide);
  };
}
