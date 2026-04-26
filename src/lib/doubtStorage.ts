/**
 * Local-only doubt tracker data: metadata + JPEG data URLs per photo in IndexedDB (never Supabase).
 */

import { openDB, type DBSchema } from "idb";

import { compressImageFileToDataUrl } from "@/lib/purposeStorage";

const DB_NAME = "kalnehi-doubts";
/** v3: optional `examKey` on {@link DoubtMeta} for multi-exam doubt tagging. */
const DB_VERSION = 3;
const DOUBTS_STORE = "doubts" as const;
const DOUBT_PHOTOS_STORE = "doubt_photos" as const;

export type DoubtStatus = "current" | "working" | "solved";

export type DoubtMeta = {
  id: string;
  title: string;
  description: string;
  status: DoubtStatus;
  /** Optional syllabus-style tag (e.g. Physics, General). Omitted when unset. */
  subject?: string;
  /** Optional syllabus chapter/microtopic line (`chapter — microtopic`). */
  topic?: string;
  /** Optional exam key (e.g. "NEET UG", "UPSC CSE Prelims") for multi-exam tagging. */
  examKey?: string;
  photoIds: string[];
  createdAt: number;
  updatedAt: number;
};

type DoubtPhotoRecord = {
  dataUrl: string;
};

interface DoubtDBSchema extends DBSchema {
  doubts: {
    key: string;
    value: DoubtMeta;
  };
  doubt_photos: {
    key: string;
    value: DoubtPhotoRecord;
  };
}

function photoKey(doubtId: string, photoId: string): string {
  return `${doubtId}\0${photoId}`;
}

async function getDb() {
  return openDB<DoubtDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(DOUBTS_STORE)) {
        db.createObjectStore(DOUBTS_STORE);
      }
      if (!db.objectStoreNames.contains(DOUBT_PHOTOS_STORE)) {
        db.createObjectStore(DOUBT_PHOTOS_STORE);
      }
      void oldVersion;
    },
  });
}

export async function saveDoubtMeta(meta: DoubtMeta): Promise<void> {
  const db = await getDb();
  await db.put(DOUBTS_STORE, meta, meta.id);
}

export async function getDoubtMeta(id: string): Promise<DoubtMeta | undefined> {
  const db = await getDb();
  return db.get(DOUBTS_STORE, id);
}

export async function getAllDoubtMetas(): Promise<DoubtMeta[]> {
  const db = await getDb();
  const all = await db.getAll(DOUBTS_STORE);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteDoubtMeta(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(DOUBTS_STORE, id);
}

export async function saveDoubtPhoto(
  doubtId: string,
  photoId: string,
  dataUrl: string,
): Promise<void> {
  const db = await getDb();
  await db.put(DOUBT_PHOTOS_STORE, { dataUrl }, photoKey(doubtId, photoId));
}

export async function getDoubtPhoto(
  doubtId: string,
  photoId: string,
): Promise<string | undefined> {
  const db = await getDb();
  const row = await db.get(DOUBT_PHOTOS_STORE, photoKey(doubtId, photoId));
  return row?.dataUrl;
}

export async function deleteDoubtPhoto(
  doubtId: string,
  photoId: string,
): Promise<void> {
  const db = await getDb();
  await db.delete(DOUBT_PHOTOS_STORE, photoKey(doubtId, photoId));
}

export async function deleteDoubtFully(meta: DoubtMeta): Promise<void> {
  for (const pid of meta.photoIds) {
    await deleteDoubtPhoto(meta.id, pid);
  }
  await deleteDoubtMeta(meta.id);
}

/** Restore a doubt after delete-undo (metadata + photo blobs). */
export async function restoreDoubtFully(
  meta: DoubtMeta,
  photoDataUrls: Record<string, string>,
): Promise<void> {
  await saveDoubtMeta(meta);
  for (const pid of meta.photoIds) {
    const dataUrl = photoDataUrls[pid];
    if (dataUrl) await saveDoubtPhoto(meta.id, pid, dataUrl);
  }
}

/** Compress then store; returns new photo id. */
export async function addDoubtPhotoFromFile(
  doubtId: string,
  file: File,
): Promise<string> {
  const dataUrl = await compressImageFileToDataUrl(file, {
    maxWidth: 1200,
    quality: 0.82,
  });
  const photoId = crypto.randomUUID();
  await saveDoubtPhoto(doubtId, photoId, dataUrl);
  return photoId;
}
