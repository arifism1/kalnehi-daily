import {
  deleteDB,
  openDB,
  type DBSchema,
  type IDBPDatabase,
} from "idb";

import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";
import type { Microtopic, Task } from "@/store/useTaskStore";
import type { StudySessionLog } from "@/lib/studySessionTypes";

const DB_NAME = "kalnehi-daily";
/** Recovery (Apr 2026): stay on 5 — v6 handwritten snapshot store was rolled back. `openKalnehiDb` deletes DB on VersionError so clients already on v6 can reopen cleanly (local IDB data reset). */
const DB_VERSION = 5;

export type ExecutionSessionRow = Tables<"task_sessions">;

/** Serializable planner row for Dictate My Day offline snapshot. */
export type VoicePlannerSnapshotRow = {
  id: string;
  include: boolean;
  name: string;
  startInput: string;
  endInput: string;
  duration: string | null;
  transcriptRaw?: string;
};

export type VoicePlannerSnapshot = {
  key: string;
  userId: string;
  logDate: string;
  rows: VoicePlannerSnapshotRow[];
  transcriptAggregate: string;
  updatedAt: number;
};

type KalnehiDB = DBSchema & {
  tasks: {
    key: string;
    value: Task;
  };
  microtopics: {
    key: string;
    value: Microtopic;
  };
  execution_log: {
    key: string;
    value: ExecutionSessionRow;
  };
  outbox: {
    key: string;
    value: OutboxMutation;
  };
  study_sessions: {
    key: string;
    value: StudySessionLog;
  };
  voice_planner_snapshots: {
    key: string;
    value: VoicePlannerSnapshot;
  };
};

export type OutboxMutation = {
  clientMutationId: string;
  createdAt: number;
  op:
    | "task_update"
    | "task_create"
    | "task_delete"
    | "task_session_create"
    | "study_session_create"
    | "voice_timeline_create"
    | "voice_timeline_update"
    | "voice_timeline_delete";
  taskId: string;
  /** For task_update — fields to send to updateTask */
  patch?: TablesUpdate<"tasks">;
  /** For task_create — row without user_id (server adds user) */
  insert?: Omit<TablesInsert<"tasks">, "user_id">;
  /** For task_session_create — row including client id */
  sessionInsert?: TablesInsert<"task_sessions"> & { id: string };
  /** For study_session_create — client-generated id + fields (user_id set client-side for local row) */
  studySessionInsert?: Omit<TablesInsert<"study_sessions">, "user_id"> & {
    id: string;
  };
  /** voice_timeline_create — full row except user_id (RLS fills user via session) */
  voiceInsert?: Omit<TablesInsert<"voice_timeline_entries">, "user_id">;
  /** voice_timeline_update */
  voicePatch?: TablesUpdate<"voice_timeline_entries">;
  /** How many consecutive flush attempts failed for this entry. */
  failCount?: number;
};

let dbPromise: Promise<IDBPDatabase<KalnehiDB>> | null = null;

function runUpgrade(db: IDBPDatabase<KalnehiDB>, oldVersion: number) {
  if (!db.objectStoreNames.contains("tasks")) {
    db.createObjectStore("tasks", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("microtopics")) {
    db.createObjectStore("microtopics", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("outbox")) {
    db.createObjectStore("outbox", { keyPath: "clientMutationId" });
  }
  if (oldVersion < 3 && !db.objectStoreNames.contains("execution_log")) {
    db.createObjectStore("execution_log", { keyPath: "id" });
  }
  if (oldVersion < 4 && !db.objectStoreNames.contains("study_sessions")) {
    db.createObjectStore("study_sessions", { keyPath: "id" });
  }
  if (oldVersion < 5 && !db.objectStoreNames.contains("voice_planner_snapshots")) {
    db.createObjectStore("voice_planner_snapshots", { keyPath: "key" });
  }
}

async function openKalnehiDb(): Promise<IDBPDatabase<KalnehiDB>> {
  try {
    return await openDB<KalnehiDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        try {
          runUpgrade(db, oldVersion);
        } catch (e) {
          console.error("[taskIdb] upgrade failed", e);
          throw e;
        }
      },
    });
  } catch (err) {
    const retriable =
      err instanceof DOMException &&
      (err.name === "VersionError" || err.name === "AbortError");
    if (retriable && typeof indexedDB !== "undefined") {
      console.warn(
        "[taskIdb] IndexedDB open failed; deleting database and retrying once",
        err,
      );
      try {
        await deleteDB(DB_NAME);
      } catch {
        /* ignore */
      }
      return await openDB<KalnehiDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          runUpgrade(db, oldVersion);
        },
      });
    }
    throw err;
  }
}

export function getDb(): Promise<IDBPDatabase<KalnehiDB>> {
  if (!dbPromise) {
    dbPromise = openKalnehiDb().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

export function voicePlannerSnapshotKey(userId: string, logDate: string): string {
  return `${userId}|${logDate}`;
}

export async function putVoicePlannerSnapshot(
  snap: VoicePlannerSnapshot,
): Promise<void> {
  const db = await getDb();
  await db.put("voice_planner_snapshots", snap);
}

export async function getVoicePlannerSnapshot(
  userId: string,
  logDate: string,
): Promise<VoicePlannerSnapshot | undefined> {
  const db = await getDb();
  return db.get("voice_planner_snapshots", voicePlannerSnapshotKey(userId, logDate));
}

export async function loadAllLocalState(): Promise<{
  tasks: Task[];
  microtopics: Microtopic[];
}> {
  const db = await getDb();
  const [tasks, microtopics] = await Promise.all([
    db.getAll("tasks"),
    db.getAll("microtopics"),
  ]);
  return { tasks, microtopics };
}

export async function persistTasks(tasks: Task[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("tasks", "readwrite");
  await tx.store.clear();
  for (const t of tasks) {
    await tx.store.put(t);
  }
  await tx.done;
}

export async function putTask(task: Task): Promise<void> {
  const db = await getDb();
  await db.put("tasks", task);
}

export async function removeTaskLocal(taskId: string): Promise<void> {
  const db = await getDb();
  await db.delete("tasks", taskId);
}

export async function persistMicrotopics(rows: Microtopic[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("microtopics", "readwrite");
  await tx.store.clear();
  for (const m of rows) {
    await tx.store.put(m);
  }
  await tx.done;
}

export async function addOutboxMutation(
  m: Omit<OutboxMutation, "clientMutationId" | "createdAt">,
): Promise<string> {
  const db = await getDb();
  const clientMutationId = crypto.randomUUID();
  const row: OutboxMutation = {
    ...m,
    clientMutationId,
    createdAt: Date.now(),
  };
  await db.put("outbox", row);
  return clientMutationId;
}

/**
 * Persist a study session row only (e.g. server merge). Dispatches
 * `kalnehi-study-sessions-changed` on window when available.
 */
export async function putStudySessionRow(row: StudySessionLog): Promise<void> {
  const db = await getDb();
  await db.put("study_sessions", row);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kalnehi-study-sessions-changed"));
  }
}

/**
 * Single IndexedDB transaction: study session + outbox mutation. Eliminates the
 * window where a session exists locally but sync was never queued.
 */
export async function putStudySessionWithOutboxMutation(
  local: StudySessionLog,
  m: Omit<OutboxMutation, "clientMutationId" | "createdAt">,
): Promise<string> {
  const db = await getDb();
  const clientMutationId = crypto.randomUUID();
  const outRow: OutboxMutation = {
    ...m,
    clientMutationId,
    createdAt: Date.now(),
  };
  const tx = db.transaction(["study_sessions", "outbox"], "readwrite");
  await tx.objectStore("study_sessions").put(local);
  await tx.objectStore("outbox").put(outRow);
  await tx.done;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kalnehi-study-sessions-changed"));
  }
  return clientMutationId;
}

/** Returns true if an entry existed and was removed (pending sync cancelled). */
export async function removeOutboxMutationIfPresent(
  clientMutationId: string,
): Promise<boolean> {
  const db = await getDb();
  const row = await db.get("outbox", clientMutationId);
  if (!row) return false;
  await db.delete("outbox", clientMutationId);
  return true;
}

export async function getAllOutboxMutations(): Promise<OutboxMutation[]> {
  const db = await getDb();
  const rows = await db.getAll("outbox");
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteOutboxMutation(clientMutationId: string): Promise<void> {
  const db = await getDb();
  await db.delete("outbox", clientMutationId);
}

export async function bumpOutboxFailCount(clientMutationId: string): Promise<void> {
  const db = await getDb();
  const row = await db.get("outbox", clientMutationId);
  if (!row) return;
  row.failCount = (row.failCount ?? 0) + 1;
  await db.put("outbox", row);
}

export async function resetAllOutboxFailCounts(): Promise<void> {
  const db = await getDb();
  const all = await db.getAll("outbox");
  const tx = db.transaction("outbox", "readwrite");
  for (const row of all) {
    if ((row.failCount ?? 0) > 0) {
      row.failCount = 0;
      await tx.store.put(row);
    }
  }
  await tx.done;
}

export async function getOutboxCount(): Promise<number> {
  const db = await getDb();
  return db.count("outbox");
}

export async function clearOutbox(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("outbox", "readwrite");
  await tx.store.clear();
  await tx.done;
}

export async function putExecutionSession(row: ExecutionSessionRow): Promise<void> {
  const db = await getDb();
  await db.put("execution_log", row);
}

export async function getAllExecutionSessions(): Promise<ExecutionSessionRow[]> {
  const db = await getDb();
  return db.getAll("execution_log");
}

export async function mergeExecutionSessions(rows: ExecutionSessionRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  const tx = db.transaction("execution_log", "readwrite");
  for (const r of rows) {
    await tx.store.put(r);
  }
  await tx.done;
}
