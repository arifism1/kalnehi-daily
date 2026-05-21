"use client";

import {
  NOTIFICATION_PREFS_DEFAULTS,
  NOTIFICATION_PREFS_LEGACY_KEY,
} from "@/lib/engine/notificationPrefs";
import {
  REVISION_LEGACY_STORAGE_KEY,
  type RevisionDifficulty,
  type RevisionReminderSource,
  type RevisionReminderStatus,
} from "@/lib/engine/revisionSchedule";

import {
  createEmptyUserPlannerTextBundle,
  enqueueUserPlannerTextOutbox,
  getUserPlannerTextBundleCached,
  saveUserPlannerTextBundleCached,
} from "@/lib/userPlannerTextLocal";
import type {
  PlannerTodoState,
  RevisionQueueEntry,
  UserPlannerTextBundle,
} from "@/lib/userPlannerTextTypes";

export const PLANNER_TEXT_MIGRATED_FLAG_KEY = "kalnehi-planner-text-migrated-v1";
export const PRODUCTIVITY_LEGACY_STORAGE_KEY = "kalnehi-productivity-v1";
export const QUICK_TODOS_LEGACY_STORAGE_KEY = "kalnehi-exam-todos-v1";

type LegacyTodo = {
  id: string;
  text: string;
  priority: "high" | "med" | "low";
  done: boolean;
};

type LegacyProductivity = {
  notes?: string;
  p1?: string;
  p2?: string;
  p3?: string;
};

function isRevisionDifficulty(x: unknown): x is RevisionDifficulty {
  return x === "easy" || x === "medium" || x === "hard";
}

function readLegacyRevisions(): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REVISION_LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLegacyProductivity(): LegacyProductivity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PRODUCTIVITY_LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LegacyProductivity;
  } catch {
    return null;
  }
}

function readLegacyTodos(): LegacyTodo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUICK_TODOS_LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyTodo[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function productivityHasContent(p: LegacyProductivity | null): boolean {
  if (!p) return false;
  return Boolean(
    (p.notes && p.notes.trim()) ||
      (p.p1 && p.p1.trim()) ||
      (p.p2 && p.p2.trim()) ||
      (p.p3 && p.p3.trim()),
  );
}

/**
 * One-time: merge legacy localStorage planner keys into the IDB bundle and enqueue sync ops.
 */
export async function maybeMigrateLegacyPlannerTextOnce(
  userId: string,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(PLANNER_TEXT_MIGRATED_FLAG_KEY)) return;

  const legRev = readLegacyRevisions();
  const legTodo = readLegacyTodos();
  const legProd = readLegacyProductivity();
  let legacyPrefsParsed = false;
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_LEGACY_KEY);
    legacyPrefsParsed = Boolean(raw && raw.trim().length > 1);
  } catch {
    legacyPrefsParsed = false;
  }

  const hadAnyLegacy =
    legRev.length > 0 ||
    legTodo.length > 0 ||
    productivityHasContent(legProd) ||
    legacyPrefsParsed;

  if (!hadAnyLegacy) {
    localStorage.setItem(PLANNER_TEXT_MIGRATED_FLAG_KEY, "1");
    return;
  }

  const bundle =
    (await getUserPlannerTextBundleCached(userId)) ??
    createEmptyUserPlannerTextBundle(userId);

  const nowIso = new Date().toISOString();

  const revisionItems: RevisionQueueEntry[] =
    legRev.length > 0
      ? legRev.map((raw, i) => {
          const r = raw as Record<string, unknown>;
          const id =
            typeof r.id === "string" && r.id.length > 0 ? r.id : `legacy-${i}`;
          const title =
            typeof r.title === "string" && r.title.trim().length > 0
              ? r.title.trim()
              : "Revision";
          const difficulty: RevisionDifficulty = isRevisionDifficulty(
            r.difficulty,
          )
            ? r.difficulty
            : "medium";
          const nextDue =
            typeof r.nextDue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.nextDue)
              ? r.nextDue
              : new Date().toISOString().slice(0, 10);
          const lastReviewed =
            typeof r.lastReviewed === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(r.lastReviewed)
              ? r.lastReviewed
              : null;
          const createdAt =
            typeof r.createdAt === "string" && r.createdAt.length > 0
              ? r.createdAt
              : nowIso;
          const microtopicId =
            typeof r.microtopicId === "string" && r.microtopicId.trim().length > 0
              ? r.microtopicId.trim()
              : undefined;
          const notes =
            typeof r.notes === "string" ? r.notes.slice(0, 5000) : "";
          const status: RevisionReminderStatus =
            r.status === "done" || r.status === "archived" ? r.status : "pending";
          const reminderSource: RevisionReminderSource =
            r.reminderSource === "suggested" ? "suggested" : "manual";
          return {
            id,
            title,
            microtopicId,
            difficulty,
            nextDue,
            lastReviewed,
            createdAt,
            notes,
            status,
            reminderSource,
            updatedAt: nowIso,
          };
        })
      : bundle.revisionItems.map((r) => ({
          ...r,
          notes: typeof r.notes === "string" ? r.notes : "",
          status:
            r.status === "done" || r.status === "archived" ? r.status : "pending",
          reminderSource:
            r.reminderSource === "suggested" ? "suggested" : "manual",
        }));

  let productivity = { ...bundle.productivity };
  let productivityUpdatedAt = bundle.productivityUpdatedAt;
  if (productivityHasContent(legProd) && legProd) {
    productivity = {
      notes: typeof legProd.notes === "string" ? legProd.notes : "",
      p1: typeof legProd.p1 === "string" ? legProd.p1 : "",
      p2: typeof legProd.p2 === "string" ? legProd.p2 : "",
      p3: typeof legProd.p3 === "string" ? legProd.p3 : "",
    };
    productivityUpdatedAt = nowIso;
  }

  const todos: PlannerTodoState[] =
    legTodo.length > 0
      ? legTodo.map((t, i) => ({
          id: t.id,
          text: t.text,
          priority: t.priority,
          done: t.done,
          position: i,
          updatedAt: nowIso,
          createdAt: nowIso,
        }))
      : [...bundle.todos];

  let enginePrefs = { ...bundle.enginePrefs };
  let prefsUpdatedAt = bundle.prefsUpdatedAt;
  if (legacyPrefsParsed) {
    try {
      const raw = localStorage.getItem(NOTIFICATION_PREFS_LEGACY_KEY);
      if (raw) {
        const o = JSON.parse(raw) as Partial<UserPlannerTextBundle["enginePrefs"]>;
        enginePrefs = { ...NOTIFICATION_PREFS_DEFAULTS, ...o };
        prefsUpdatedAt = nowIso;
      }
    } catch {
      /* ignore */
    }
  }

  const next: UserPlannerTextBundle = {
    userId,
    revisionItems,
    productivity,
    productivityUpdatedAt,
    todos,
    enginePrefs,
    prefsUpdatedAt,
    updatedAt: Date.now(),
  };

  await saveUserPlannerTextBundleCached(next);

  for (const r of next.revisionItems) {
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox enqueue must preserve FIFO order for migration
    await enqueueUserPlannerTextOutbox(userId, {
      kind: "revision_upsert",
      id: r.id,
      title: r.title,
      microtopicId: r.microtopicId,
      difficulty: r.difficulty,
      nextDue: r.nextDue,
      lastReviewed: r.lastReviewed,
      createdAt: r.createdAt,
      notes: r.notes,
      status: r.status,
      reminderSource: r.reminderSource,
    });
  }

  await enqueueUserPlannerTextOutbox(userId, {
    kind: "productivity_put",
    notes: next.productivity.notes,
    p1: next.productivity.p1,
    p2: next.productivity.p2,
    p3: next.productivity.p3,
  });

  for (const t of next.todos) {
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox enqueue must preserve FIFO order for migration
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

  await enqueueUserPlannerTextOutbox(userId, {
    kind: "engine_prefs_put",
    prefs: next.enginePrefs,
  });

  localStorage.setItem(PLANNER_TEXT_MIGRATED_FLAG_KEY, "1");
}
