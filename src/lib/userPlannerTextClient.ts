"use client";

import {
  applyLoggedRevision,
  buildNewRevisionItem,
  type RevisionDifficulty,
} from "@/lib/engine/revisionSchedule";
import { maybeMigrateLegacyPlannerTextOnce } from "@/lib/userPlannerTextMigrate";
import {
  createEmptyUserPlannerTextBundle,
  enqueueUserPlannerTextOutbox,
  getUserPlannerTextBundleCached,
  saveUserPlannerTextBundleCached,
} from "@/lib/userPlannerTextLocal";
import { mergeUserPlannerTextFromServer } from "@/lib/userPlannerTextMerge";
import { scheduleUserPlannerTextFlush } from "@/lib/userPlannerTextSync";
import type {
  PlannerTodoState,
  RevisionQueueEntry,
  UserPlannerTextBundle,
} from "@/lib/userPlannerTextTypes";
import { fetchUserPlannerTextData } from "@/actions/userPlannerText";
import type { NotificationPrefs } from "@/lib/engine/notificationPrefs";

function nowIso(): string {
  return new Date().toISOString();
}

const hydrateInflight = new Map<string, Promise<UserPlannerTextBundle>>();

export async function hydrateUserPlannerTextFromServer(
  userId: string,
): Promise<UserPlannerTextBundle> {
  let p = hydrateInflight.get(userId);
  if (!p) {
    p = (async () => {
      await maybeMigrateLegacyPlannerTextOnce(userId);
      let bundle =
        (await getUserPlannerTextBundleCached(userId)) ??
        createEmptyUserPlannerTextBundle(userId);
      const fresh = await fetchUserPlannerTextData();
      if (fresh.ok) {
        bundle = mergeUserPlannerTextFromServer(bundle, fresh);
        await saveUserPlannerTextBundleCached(bundle);
      }
      return bundle;
    })().finally(() => {
      hydrateInflight.delete(userId);
    });
    hydrateInflight.set(userId, p);
  }
  return p;
}

export async function plannerTextAppendRevision(
  userId: string,
  title: string,
  difficulty: RevisionDifficulty,
  microtopicId?: string,
): Promise<UserPlannerTextBundle> {
  const bundle =
    (await getUserPlannerTextBundleCached(userId)) ??
    createEmptyUserPlannerTextBundle(userId);
  const item = buildNewRevisionItem(title, difficulty, microtopicId);
  const entry: RevisionQueueEntry = { ...item, updatedAt: nowIso() };
  const next: UserPlannerTextBundle = {
    ...bundle,
    revisionItems: [...bundle.revisionItems, entry],
    updatedAt: Date.now(),
  };
  await saveUserPlannerTextBundleCached(next);
  await enqueueUserPlannerTextOutbox(userId, {
    kind: "revision_upsert",
    id: entry.id,
    title: entry.title,
    microtopicId: entry.microtopicId,
    difficulty: entry.difficulty,
    nextDue: entry.nextDue,
    lastReviewed: entry.lastReviewed,
    createdAt: entry.createdAt,
  });
  scheduleUserPlannerTextFlush(userId);
  return next;
}

export async function plannerTextCompleteRevision(
  userId: string,
  id: string,
  today: string,
): Promise<UserPlannerTextBundle> {
  const bundle =
    (await getUserPlannerTextBundleCached(userId)) ??
    createEmptyUserPlannerTextBundle(userId);
  const idx = bundle.revisionItems.findIndex((r) => r.id === id);
  if (idx < 0) return bundle;
  const prev = bundle.revisionItems[idx]!;
  const updated = applyLoggedRevision(prev, today);
  const entry: RevisionQueueEntry = { ...updated, updatedAt: nowIso() };
  const nextItems = [...bundle.revisionItems];
  nextItems[idx] = entry;
  const next = { ...bundle, revisionItems: nextItems, updatedAt: Date.now() };
  await saveUserPlannerTextBundleCached(next);
  await enqueueUserPlannerTextOutbox(userId, {
    kind: "revision_upsert",
    id: entry.id,
    title: entry.title,
    microtopicId: entry.microtopicId,
    difficulty: entry.difficulty,
    nextDue: entry.nextDue,
    lastReviewed: entry.lastReviewed,
    createdAt: entry.createdAt,
  });
  scheduleUserPlannerTextFlush(userId);
  return next;
}

export async function plannerTextRemoveRevision(
  userId: string,
  id: string,
): Promise<UserPlannerTextBundle> {
  const bundle =
    (await getUserPlannerTextBundleCached(userId)) ??
    createEmptyUserPlannerTextBundle(userId);
  const next: UserPlannerTextBundle = {
    ...bundle,
    revisionItems: bundle.revisionItems.filter((r) => r.id !== id),
    updatedAt: Date.now(),
  };
  await saveUserPlannerTextBundleCached(next);
  await enqueueUserPlannerTextOutbox(userId, { kind: "revision_delete", id });
  scheduleUserPlannerTextFlush(userId);
  return next;
}

export async function plannerTextSetProductivity(
  userId: string,
  productivity: UserPlannerTextBundle["productivity"],
): Promise<UserPlannerTextBundle> {
  const bundle =
    (await getUserPlannerTextBundleCached(userId)) ??
    createEmptyUserPlannerTextBundle(userId);
  const next: UserPlannerTextBundle = {
    ...bundle,
    productivity: { ...productivity },
    productivityUpdatedAt: nowIso(),
    updatedAt: Date.now(),
  };
  await saveUserPlannerTextBundleCached(next);
  await enqueueUserPlannerTextOutbox(userId, {
    kind: "productivity_put",
    notes: next.productivity.notes,
    p1: next.productivity.p1,
    p2: next.productivity.p2,
    p3: next.productivity.p3,
  });
  scheduleUserPlannerTextFlush(userId);
  return next;
}

export async function plannerTextSetTodos(
  userId: string,
  todos: PlannerTodoState[],
): Promise<UserPlannerTextBundle> {
  const bundle =
    (await getUserPlannerTextBundleCached(userId)) ??
    createEmptyUserPlannerTextBundle(userId);
  const prevById = new Map(bundle.todos.map((t) => [t.id, t]));
  const positioned = todos.map((t, i) => {
    const prev = prevById.get(t.id);
    const createdAt = t.createdAt ?? prev?.createdAt ?? nowIso();
    return {
      ...t,
      position: i,
      updatedAt: nowIso(),
      createdAt,
    };
  });
  const prevIds = new Set(bundle.todos.map((t) => t.id));
  const nextIds = new Set(positioned.map((t) => t.id));
  const next: UserPlannerTextBundle = {
    ...bundle,
    todos: positioned,
    updatedAt: Date.now(),
  };
  await saveUserPlannerTextBundleCached(next);
  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      await enqueueUserPlannerTextOutbox(userId, { kind: "todo_delete", id });
    }
  }
  for (const t of positioned) {
    await enqueueUserPlannerTextOutbox(userId, {
      kind: "todo_upsert",
      id: t.id,
      text: t.text,
      priority: t.priority,
      done: t.done,
      position: t.position,
      createdAt: t.createdAt,
    });
  }
  scheduleUserPlannerTextFlush(userId);
  return next;
}

export async function plannerTextSetEnginePrefs(
  userId: string,
  prefs: NotificationPrefs,
): Promise<UserPlannerTextBundle> {
  const bundle =
    (await getUserPlannerTextBundleCached(userId)) ??
    createEmptyUserPlannerTextBundle(userId);
  const next: UserPlannerTextBundle = {
    ...bundle,
    enginePrefs: { ...prefs },
    prefsUpdatedAt: nowIso(),
    updatedAt: Date.now(),
  };
  await saveUserPlannerTextBundleCached(next);
  await enqueueUserPlannerTextOutbox(userId, {
    kind: "engine_prefs_put",
    prefs: next.enginePrefs,
  });
  scheduleUserPlannerTextFlush(userId);
  return next;
}
