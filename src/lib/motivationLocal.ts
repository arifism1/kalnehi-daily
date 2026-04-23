/**
 * Offline-first cache + outbox for Personal Motivation (IndexedDB).
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { registerOutboxBackgroundSync } from "@/lib/pwaBackgroundSync";

import type { MotivationOutboxOp } from "@/lib/motivationTypes";
import type { Tables } from "@/types/supabase";

export type MotivationLetterRow = Tables<"motivation_letters">;
export type MotivationVoiceRow = Tables<"motivation_voice_affirmations">;
export type MotivationPhotoRow = Tables<"motivation_vision_photos">;
export type MotivationPrefsRow = Tables<"user_motivation_prefs">;

export type MotivationBundle = {
  letters: MotivationLetterRow[];
  voices: MotivationVoiceRow[];
  photos: MotivationPhotoRow[];
  prefs: MotivationPrefsRow | null;
  updatedAt: number;
};

export type { MotivationOutboxOp };

type MotivationLocalRow = {
  key: string;
  bundle: MotivationBundle;
};

type OutboxRow = {
  id: string;
  userId: string;
  op: MotivationOutboxOp;
  createdAt: number;
  failCount?: number;
};

type M = DBSchema & {
  bundles: { key: string; value: MotivationLocalRow };
  outbox: { key: string; value: OutboxRow };
};

const DB_NAME = "kalnehi-motivation";
const DB_VERSION = 1;
const BUNDLE_KEY = "default";

let dbPromise: Promise<IDBPDatabase<M>> | null = null;

function getDb(): Promise<IDBPDatabase<M>> {
  if (!dbPromise) {
    dbPromise = openDB<M>(DB_NAME, DB_VERSION, {
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

export function notifyMotivationChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("kalnehi-motivation-changed"));
}

export async function getMotivationBundleCached(
  userId: string,
): Promise<MotivationBundle | null> {
  const db = await getDb();
  const row = await db.get("bundles", BUNDLE_KEY);
  if (!row?.bundle) return null;
  const first = row.bundle.letters[0]?.user_id;
  if (first && first !== userId) return null;
  return row.bundle;
}

export async function saveMotivationBundleCached(
  bundle: MotivationBundle,
): Promise<void> {
  const db = await getDb();
  await db.put("bundles", { key: BUNDLE_KEY, bundle });
  notifyMotivationChanged();
}

export async function enqueueMotivationOutbox(
  userId: string,
  op: MotivationOutboxOp,
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

export async function getAllMotivationOutbox(): Promise<OutboxRow[]> {
  const db = await getDb();
  const rows = await db.getAll("outbox");
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteMotivationOutbox(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("outbox", id);
}

export async function bumpMotivationOutboxFail(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get("outbox", id);
  if (!row) return;
  row.failCount = (row.failCount ?? 0) + 1;
  await db.put("outbox", row);
}

export async function getMotivationOutboxCount(): Promise<number> {
  const db = await getDb();
  return db.count("outbox");
}

export function mergeBundleFromServer(
  prev: MotivationBundle | null,
  next: Omit<MotivationBundle, "updatedAt">,
): MotivationBundle {
  return {
    ...next,
    updatedAt: Date.now(),
  };
}
