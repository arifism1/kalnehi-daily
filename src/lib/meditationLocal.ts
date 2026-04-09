import { format } from "date-fns";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { MeditationSessionRow } from "@/lib/meditationTypes";

export type MeditationOutboxOp = {
  kind: "session_create";
  row: MeditationSessionRow;
};

type LocalRow = {
  key: string;
  userId: string;
  rows: MeditationSessionRow[];
  updatedAt: number;
};

type OutboxRow = {
  id: string;
  userId: string;
  op: MeditationOutboxOp;
  createdAt: number;
  failCount?: number;
};

type M = DBSchema & {
  sessions: { key: string; value: LocalRow };
  outbox: { key: string; value: OutboxRow };
};

const DB_NAME = "kalnehi-meditation";
/** v2: enforce both stores on all upgrade paths. */
const DB_VERSION = 2;
const SESSIONS_KEY = "sessions";

let dbPromise: Promise<IDBPDatabase<M>> | null = null;

function ensureStore(
  db: IDBPDatabase<M>,
  store: "sessions" | "outbox",
  keyPath: string,
): void {
  if (!db.objectStoreNames.contains(store)) {
    db.createObjectStore(store, { keyPath });
  }
}

function migrateDatabase(
  db: IDBPDatabase<M>,
  oldVersion: number,
  newVersion: number,
): void {
  if (oldVersion < 1) {
    ensureStore(db, "sessions", "key");
    ensureStore(db, "outbox", "id");
  }
  if (oldVersion < 2) {
    ensureStore(db, "sessions", "key");
    ensureStore(db, "outbox", "id");
  }
  // Safety net for any irregular legacy shape.
  ensureStore(db, "sessions", "key");
  ensureStore(db, "outbox", "id");
  console.log(`[meditationLocal] migrate done: v${oldVersion} -> v${newVersion}`);
}

function getDb(): Promise<IDBPDatabase<M>> {
  if (!dbPromise) {
    dbPromise = openDB<M>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        migrateDatabase(db, oldVersion, newVersion ?? DB_VERSION);
      },
    }).catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

export function notifyMeditationChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kalnehi-meditation-changed"));
  }
}

export async function getMeditationSessions(userId: string): Promise<MeditationSessionRow[]> {
  const db = await getDb();
  const row = await db.get("sessions", SESSIONS_KEY);
  if (!row || row.userId !== userId) return [];
  return [...row.rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function saveMeditationSessions(
  userId: string,
  rows: MeditationSessionRow[],
): Promise<void> {
  const db = await getDb();
  await db.put("sessions", {
    key: SESSIONS_KEY,
    userId,
    rows,
    updatedAt: Date.now(),
  });
  notifyMeditationChanged();
}

export async function upsertMeditationSessionLocal(row: MeditationSessionRow): Promise<void> {
  const current = await getMeditationSessions(row.user_id);
  const ix = current.findIndex((x) => x.id === row.id);
  const next = [...current];
  if (ix >= 0) next[ix] = row;
  else next.unshift(row);
  await saveMeditationSessions(row.user_id, next);
}

export async function enqueueMeditationOutbox(
  userId: string,
  op: MeditationOutboxOp,
): Promise<void> {
  const db = await getDb();
  await db.put("outbox", {
    id: crypto.randomUUID(),
    userId,
    op,
    createdAt: Date.now(),
  });
}

export async function getMeditationOutbox(userId: string): Promise<OutboxRow[]> {
  const db = await getDb();
  const rows = await db.getAll("outbox");
  return rows
    .filter((r) => r.userId === userId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteMeditationOutbox(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("outbox", id);
}

export async function bumpMeditationOutboxFail(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get("outbox", id);
  if (!row) return;
  row.failCount = (row.failCount ?? 0) + 1;
  await db.put("outbox", row);
}

export function computeMeditationStreak(rows: MeditationSessionRow[], todayIso: string): number {
  const doneDays = new Set(rows.map((r) => r.session_date));
  let n = 0;
  let d = new Date(`${todayIso}T00:00:00`);
  while (true) {
    const key = format(d, "yyyy-MM-dd");
    if (!doneDays.has(key)) break;
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function computeMonthTotalSeconds(
  rows: MeditationSessionRow[],
  monthPrefix: string,
): number {
  return rows
    .filter((r) => r.session_date.startsWith(monthPrefix))
    .reduce((sum, r) => sum + r.duration_seconds, 0);
}
