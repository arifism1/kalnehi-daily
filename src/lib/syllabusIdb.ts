/**
 * Offline syllabus snapshot + status mutation outbox (IndexedDB).
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { ExamTrack } from "@/lib/examTracks";
import type { MicrotopicProgressStatus } from "@/lib/syllabusConstants";
import type { SyllabusDataForUserResult } from "@/lib/syllabusDataForUser";
import { registerOutboxBackgroundSync } from "@/lib/pwaBackgroundSync";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";

export type SyllabusSnapshot = {
  userId: string;
  rows: MergedSyllabusRow[];
  statusBySyllabusMasterId: Record<string, string>;
  targetExamLabel: string | null;
  cuetDomainSubjects: string[];
  upscOptionalSubject: string | null;
  catalogExamKey: string | null;
  selectedTrack: ExamTrack | null;
  examResults: SyllabusDataForUserResult[];
  cachedAt: number;
};

export type SyllabusOutboxOp =
  | {
      type: "status";
      syllabusMasterId: string;
      status: MicrotopicProgressStatus;
    }
  | {
      type: "bulk";
      syllabusMasterIds: string[];
      status: MicrotopicProgressStatus;
    };

type SnapshotRow = { key: string; snapshot: SyllabusSnapshot };
type OutboxRow = {
  id: string;
  userId: string;
  op: SyllabusOutboxOp;
  createdAt: number;
  failCount?: number;
};

type SyllabusDB = DBSchema & {
  snapshots: { key: string; value: SnapshotRow };
  outbox: { key: string; value: OutboxRow };
};

const DB_NAME = "kalnehi-syllabus";
const DB_VERSION = 1;
const SNAPSHOT_KEY = "default";

let dbPromise: Promise<IDBPDatabase<SyllabusDB>> | null = null;

function getDb(): Promise<IDBPDatabase<SyllabusDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SyllabusDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("snapshots")) {
          db.createObjectStore("snapshots", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("outbox")) {
          db.createObjectStore("outbox", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getSyllabusSnapshot(
  userId: string,
): Promise<SyllabusSnapshot | null> {
  const db = await getDb();
  const row = await db.get("snapshots", SNAPSHOT_KEY);
  if (!row?.snapshot || row.snapshot.userId !== userId) return null;
  return row.snapshot;
}

export async function saveSyllabusSnapshot(snapshot: SyllabusSnapshot): Promise<void> {
  const db = await getDb();
  await db.put("snapshots", {
    key: SNAPSHOT_KEY,
    snapshot: { ...snapshot, cachedAt: Date.now() },
  });
}

export async function patchSyllabusSnapshotStatus(
  userId: string,
  statusPatch: Record<string, string>,
): Promise<void> {
  const snap = await getSyllabusSnapshot(userId);
  if (!snap) return;
  await saveSyllabusSnapshot({
    ...snap,
    statusBySyllabusMasterId: { ...snap.statusBySyllabusMasterId, ...statusPatch },
  });
}

export async function enqueueSyllabusOutbox(
  userId: string,
  op: SyllabusOutboxOp,
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

export async function getAllSyllabusOutbox(): Promise<OutboxRow[]> {
  const db = await getDb();
  const rows = await db.getAll("outbox");
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteSyllabusOutbox(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("outbox", id);
}

export async function bumpSyllabusOutboxFail(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get("outbox", id);
  if (!row) return;
  row.failCount = (row.failCount ?? 0) + 1;
  await db.put("outbox", row);
}
