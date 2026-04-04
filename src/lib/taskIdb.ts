import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { TablesInsert, TablesUpdate } from "@/types/supabase";
import type { Microtopic, Task } from "@/store/useTaskStore";

const DB_NAME = "kalnehi-daily";
const DB_VERSION = 2;

type KalnehiDB = DBSchema & {
  tasks: {
    key: string;
    value: Task;
  };
  microtopics: {
    key: string;
    value: Microtopic;
  };
  outbox: {
    key: string;
    value: OutboxMutation;
  };
};

export type OutboxMutation = {
  clientMutationId: string;
  createdAt: number;
  op: "task_update" | "task_create" | "task_delete";
  taskId: string;
  /** For task_update — fields to send to updateTask */
  patch?: TablesUpdate<"tasks">;
  /** For task_create — row without user_id (server adds user) */
  insert?: Omit<TablesInsert<"tasks">, "user_id">;
};

let dbPromise: Promise<IDBPDatabase<KalnehiDB>> | null = null;

function getDb(): Promise<IDBPDatabase<KalnehiDB>> {
  dbPromise ??= openDB<KalnehiDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("tasks")) {
        db.createObjectStore("tasks", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("microtopics")) {
        db.createObjectStore("microtopics", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "clientMutationId" });
      }
    },
  });
  return dbPromise;
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

export async function addOutboxMutation(m: Omit<OutboxMutation, "clientMutationId" | "createdAt">): Promise<void> {
  const db = await getDb();
  const row: OutboxMutation = {
    ...m,
    clientMutationId: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.put("outbox", row);
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
