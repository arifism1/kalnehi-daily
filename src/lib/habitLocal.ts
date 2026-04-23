/**
 * Offline-first cache + outbox for Habit Maker (IndexedDB).
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { HabitOutboxOp } from "@/lib/habitTypes";
import { registerOutboxBackgroundSync } from "@/lib/pwaBackgroundSync";
import type { Tables } from "@/types/supabase";

export type UserHabitRow = Tables<"user_habits">;
export type HabitLogRow = Tables<"habit_logs">;

export type HabitBundle = {
  habits: UserHabitRow[];
  logs: HabitLogRow[];
  updatedAt: number;
};

export type { HabitOutboxOp };

type BundleStore = { key: string; bundle: HabitBundle };
type OutboxRow = {
  id: string;
  userId: string;
  op: HabitOutboxOp;
  createdAt: number;
  failCount?: number;
};

type HabitDB = DBSchema & {
  bundles: { key: string; value: BundleStore };
  outbox: { key: string; value: OutboxRow };
};

const DB_NAME = "kalnehi-habits";
const DB_VERSION = 1;
const BUNDLE_KEY = "default";

let dbPromise: Promise<IDBPDatabase<HabitDB>> | null = null;

function getDb(): Promise<IDBPDatabase<HabitDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HabitDB>(DB_NAME, DB_VERSION, {
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

export async function getHabitBundleCached(userId: string): Promise<HabitBundle | null> {
  const db = await getDb();
  const row = await db.get("bundles", BUNDLE_KEY);
  if (!row?.bundle) return null;
  const first = row.bundle.habits[0]?.user_id;
  if (first && first !== userId) return null;
  return row.bundle;
}

export function notifyHabitBundleChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("kalnehi-habits-changed"));
}

export async function saveHabitBundleCached(bundle: HabitBundle): Promise<void> {
  const db = await getDb();
  await db.put("bundles", { key: BUNDLE_KEY, bundle });
  notifyHabitBundleChanged();
}

export async function enqueueHabitOutbox(
  userId: string,
  op: HabitOutboxOp,
): Promise<void> {
  const db = await getDb();
  await db.put("outbox", {
    id: crypto.randomUUID(),
    userId,
    op,
    createdAt: Date.now(),
  });
  registerOutboxBackgroundSync().catch(() => {});
}

export async function getAllHabitOutbox(): Promise<OutboxRow[]> {
  const db = await getDb();
  const rows = await db.getAll("outbox");
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteHabitOutbox(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("outbox", id);
}

export async function bumpHabitOutboxFail(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get("outbox", id);
  if (!row) return;
  row.failCount = (row.failCount ?? 0) + 1;
  await db.put("outbox", row);
}

export function mergeHabitBundleFromServer(
  prev: HabitBundle | null,
  next: Omit<HabitBundle, "updatedAt">,
): HabitBundle {
  return { ...next, updatedAt: Date.now() };
}
