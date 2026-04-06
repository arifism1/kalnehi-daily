import { deleteDB, openDB } from "idb";

import type { StudySessionLog } from "@/lib/studySessionTypes";
import { getDb, putStudySessionRow } from "@/lib/taskIdb";

export type { StudySessionLog } from "@/lib/studySessionTypes";

const LEGACY_DB_NAME = "kalnehi-study-sessions";
const LEGACY_STORE = "sessions";
const LEGACY_DB_VERSION = 2;

const MIGRATION_LS_KEY = "kalnehi-study-sessions-migrated-to-daily-v1";

type LegacyRow = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationActiveSeconds: number;
  subject: string | null;
};

function isLegacy(r: unknown): r is LegacyRow {
  if (!r || typeof r !== "object") return false;
  return "durationActiveSeconds" in r;
}

function normalize(raw: unknown): StudySessionLog | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;

  if (isLegacy(raw)) {
    return {
      id: r.id,
      user_id: "",
      subject: (typeof r.subject === "string" && r.subject.trim()) || "Study session",
      duration_seconds: Math.max(0, Number(r.durationActiveSeconds) || 0),
      is_camera_proven: true,
      started_at: String(r.startedAt),
      ended_at: String(r.endedAt),
    };
  }

  if (
    typeof r.user_id === "string" &&
    typeof r.subject === "string" &&
    typeof r.duration_seconds === "number" &&
    typeof r.is_camera_proven === "boolean" &&
    typeof r.started_at === "string" &&
    typeof r.ended_at === "string"
  ) {
    return {
      id: r.id,
      user_id: r.user_id,
      subject: r.subject,
      duration_seconds: r.duration_seconds,
      is_camera_proven: r.is_camera_proven,
      started_at: r.started_at,
      ended_at: r.ended_at,
    };
  }

  return null;
}

let migrationInflight: Promise<void> | null = null;

/**
 * One-time copy from legacy `kalnehi-study-sessions` DB into `kalnehi-daily.study_sessions`.
 * Export so callers can run this before an atomic session+outbox write.
 */
export async function migrateLegacyStudySessionsIfNeeded(): Promise<void> {
  if (migrationInflight) return migrationInflight;
  migrationInflight = runLegacyMigration();
  try {
    await migrationInflight;
  } finally {
    migrationInflight = null;
  }
}

async function runLegacyMigration(): Promise<void> {
  try {
    if (
      typeof localStorage !== "undefined" &&
      localStorage.getItem(MIGRATION_LS_KEY) === "1"
    ) {
      return;
    }
  } catch {
    /* ignore */
  }

  let legacyDb: Awaited<ReturnType<typeof openLegacyDb>> | null = null;
  try {
    legacyDb = await openLegacyDb();
  } catch {
    return;
  }

  try {
    const raw = await legacyDb.getAll(LEGACY_STORE);
    await legacyDb.close();
    legacyDb = null;

    if (raw.length === 0) {
      await deleteDB(LEGACY_DB_NAME).catch(() => {});
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(MIGRATION_LS_KEY, "1");
        }
      } catch {
        /* ignore */
      }
      return;
    }

    const db = await getDb();
    const tx = db.transaction("study_sessions", "readwrite");
    for (const r of raw) {
      const n = normalize(r);
      if (n) await tx.store.put(n);
    }
    await tx.done;

    await deleteDB(LEGACY_DB_NAME).catch(() => {});
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(MIGRATION_LS_KEY, "1");
      }
    } catch {
      /* ignore */
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("kalnehi-study-sessions-changed"));
    }
  } catch {
    if (legacyDb) {
      try {
        legacyDb.close();
      } catch {
        /* ignore */
      }
    }
  }
}

function openLegacyDb() {
  return openDB(LEGACY_DB_NAME, LEGACY_DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(LEGACY_STORE)) {
        database.createObjectStore(LEGACY_STORE, { keyPath: "id" });
      }
    },
  });
}

export async function putStudySession(row: StudySessionLog): Promise<void> {
  await migrateLegacyStudySessionsIfNeeded();
  await putStudySessionRow(row);
}

export async function saveStudySession(row: StudySessionLog): Promise<void> {
  await putStudySession(row);
}

export async function getAllStudySessions(): Promise<StudySessionLog[]> {
  await migrateLegacyStudySessionsIfNeeded();
  const db = await getDb();
  const raw = await db.getAll("study_sessions");
  const rows: StudySessionLog[] = [];
  for (const r of raw) {
    const n = normalize(r);
    if (n) rows.push(n);
  }
  rows.sort((a, b) => b.ended_at.localeCompare(a.ended_at));
  return rows;
}

export async function mergeStudySessions(rows: StudySessionLog[]): Promise<void> {
  await migrateLegacyStudySessionsIfNeeded();
  if (rows.length === 0) return;
  const db = await getDb();
  const tx = db.transaction("study_sessions", "readwrite");
  for (const r of rows) {
    await tx.store.put(r);
  }
  await tx.done;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kalnehi-study-sessions-changed"));
  }
}
