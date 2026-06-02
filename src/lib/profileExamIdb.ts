/**
 * Cached user_profiles exam fields for offline planner / task refresh.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type ProfileExamCache = {
  userId: string;
  primary_exam: string | null;
  target_exam: string | null;
  cuet_domain_subjects: unknown;
  upsc_optional_subjects: unknown;
  cachedAt: number;
};

type ProfileDB = DBSchema & {
  profile: { key: string; value: ProfileExamCache };
};

const DB_NAME = "kalnehi-profile-exam";
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<ProfileDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ProfileDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ProfileDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("profile")) {
          db.createObjectStore("profile", { keyPath: "userId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getProfileExamCache(
  userId: string,
): Promise<ProfileExamCache | null> {
  const db = await getDb();
  return (await db.get("profile", userId)) ?? null;
}

export async function saveProfileExamCache(
  userId: string,
  fields: Omit<ProfileExamCache, "userId" | "cachedAt">,
): Promise<void> {
  const db = await getDb();
  await db.put("profile", {
    userId,
    ...fields,
    cachedAt: Date.now(),
  });
}
