/**
 * Offline-first IndexedDB cache + outbox for planner text domains
 * (revision queue, productivity scratchpad, quick exam todos, engine notification prefs).
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { NOTIFICATION_PREFS_DEFAULTS } from "@/lib/engine/notificationPrefs";
import type {
  UserPlannerTextBundle,
  UserPlannerTextOutboxOp,
} from "@/lib/userPlannerTextTypes";

type BundleRow = { key: string; bundle: UserPlannerTextBundle };
type OutboxRow = {
  id: string;
  userId: string;
  op: UserPlannerTextOutboxOp;
  createdAt: number;
  failCount?: number;
};

type PlannerTextDB = DBSchema & {
  bundles: { key: string; value: BundleRow };
  outbox: { key: string; value: OutboxRow };
};

const DB_NAME = "kalnehi-user-planner-text";
const DB_VERSION = 1;
const BUNDLE_KEY = "default";

export function createEmptyUserPlannerTextBundle(
  userId: string,
): UserPlannerTextBundle {
  return {
    userId,
    revisionItems: [],
    productivity: { notes: "", p1: "", p2: "", p3: "" },
    productivityUpdatedAt: null,
    todos: [],
    enginePrefs: { ...NOTIFICATION_PREFS_DEFAULTS },
    prefsUpdatedAt: null,
    updatedAt: Date.now(),
  };
}

let dbPromise: Promise<IDBPDatabase<PlannerTextDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PlannerTextDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PlannerTextDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("bundles")) {
          db.createObjectStore("bundles", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("outbox")) {
          db.createObjectStore("outbox", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export function notifyUserPlannerTextChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("kalnehi-user-planner-text-changed"));
}

export async function getUserPlannerTextBundleCached(
  userId: string,
): Promise<UserPlannerTextBundle | null> {
  const db = await getDb();
  const row = await db.get("bundles", BUNDLE_KEY);
  if (!row?.bundle || row.bundle.userId !== userId) return null;
  return row.bundle;
}

export async function saveUserPlannerTextBundleCached(
  bundle: UserPlannerTextBundle,
): Promise<void> {
  const db = await getDb();
  await db.put("bundles", { key: BUNDLE_KEY, bundle });
  notifyUserPlannerTextChanged();
}

export async function enqueueUserPlannerTextOutbox(
  userId: string,
  op: UserPlannerTextOutboxOp,
): Promise<void> {
  const db = await getDb();
  await db.put("outbox", {
    id: crypto.randomUUID(),
    userId,
    op,
    createdAt: Date.now(),
  });
}

export async function getAllUserPlannerTextOutbox(): Promise<OutboxRow[]> {
  const db = await getDb();
  const rows = await db.getAll("outbox");
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteUserPlannerTextOutbox(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("outbox", id);
}

export async function bumpUserPlannerTextOutboxFail(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get("outbox", id);
  if (!row) return;
  row.failCount = (row.failCount ?? 0) + 1;
  await db.put("outbox", row);
}
