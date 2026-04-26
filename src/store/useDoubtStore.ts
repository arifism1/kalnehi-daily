import { create } from "zustand";

import {
  addDoubtPhotoFromFile,
  deleteDoubtFully,
  deleteDoubtPhoto,
  getAllDoubtMetas,
  getDoubtPhoto,
  type DoubtMeta,
  type DoubtStatus,
  restoreDoubtFully,
  saveDoubtMeta,
} from "@/lib/doubtStorage";
import {
  normalizeStoredDoubtSubject,
  normalizeStoredDoubtTopic,
} from "@/lib/doubtSubjects";
import { isLikelyImageFile } from "@/lib/purposeStorage";
import { toUserFacingLocalError } from "@/lib/userFacingErrors";

export type { DoubtStatus };

export type Doubt = DoubtMeta;

/** In-memory preview URLs keyed `doubtId::photoId` (from IndexedDB, never uploaded). */
type PhotoUrlCache = Record<string, string>;

function cacheKey(doubtId: string, photoId: string): string {
  return `${doubtId}::${photoId}`;
}

async function loadPhotoCacheForDoubts(metas: DoubtMeta[]): Promise<PhotoUrlCache> {
  const out: PhotoUrlCache = {};
  await Promise.all(
    metas.flatMap((d) =>
      d.photoIds.map(async (pid) => {
        const url = await getDoubtPhoto(d.id, pid);
        if (url) out[cacheKey(d.id, pid)] = url;
      }),
    ),
  );
  return out;
}

type DoubtStore = {
  doubts: DoubtMeta[];
  photoUrls: PhotoUrlCache;
  hydrated: boolean;
  hydrateError: string | null;
  hydrate: () => Promise<void>;
  createDoubt: (input: {
    title: string;
    description: string;
    initialFiles?: File[];
    subject?: string | null;
    topic?: string | null;
    examKey?: string | null;
  }) => Promise<string>;
  /** Empty card in Current — user types title inline (no modal). */
  quickCreateDoubt: () => Promise<string>;
  updateDoubtText: (
    id: string,
    patch: {
      title?: string;
      description?: string;
      subject?: string | null;
      topic?: string | null;
    },
  ) => Promise<void>;
  setDoubtStatus: (id: string, status: DoubtStatus) => Promise<void>;
  addPhoto: (doubtId: string, file: File) => Promise<void>;
  removePhoto: (doubtId: string, photoId: string) => Promise<void>;
  deleteDoubt: (id: string) => Promise<void>;
  /** Restore after delete-undo (same id, photos by photoId → data URL). */
  restoreDoubt: (
    meta: DoubtMeta,
    photoDataUrls: Record<string, string>,
  ) => Promise<void>;
};

export const useDoubtStore = create<DoubtStore>((set, get) => ({
  doubts: [],
  photoUrls: {},
  hydrated: false,
  hydrateError: null,

  hydrate: async () => {
    if (typeof window === "undefined") return;
    try {
      const metas = await getAllDoubtMetas();
      const photoUrls = await loadPhotoCacheForDoubts(metas);
      set({
        doubts: metas,
        photoUrls,
        hydrated: true,
        hydrateError: null,
      });
    } catch (e) {
      set({
        hydrateError: toUserFacingLocalError(e),
        hydrated: true,
      });
    }
  },

  createDoubt: async ({ title, description, initialFiles, subject, topic, examKey }) => {
    const now = Date.now();
    const id = crypto.randomUUID();
    const t = title.trim() || "Untitled doubt";
    const desc = description.trim();
    const sub = normalizeStoredDoubtSubject(subject);
    const top = normalizeStoredDoubtTopic(topic);
    const ek = examKey?.trim() || undefined;

    const meta: DoubtMeta = {
      id,
      title: t,
      description: desc,
      status: "current",
      photoIds: [],
      createdAt: now,
      ...(ek ? { examKey: ek } : {}),
      updatedAt: now,
      ...(sub ? { subject: sub } : {}),
      ...(top ? { topic: top } : {}),
    };

    const files = initialFiles ?? [];
    for (const file of files) {
      if (!isLikelyImageFile(file)) continue;
      const pid = await addDoubtPhotoFromFile(id, file);
      meta.photoIds.push(pid);
    }

    await saveDoubtMeta(meta);
    const photoUrls = await loadPhotoCacheForDoubts([meta]);
    set((s) => ({
      doubts: [meta, ...s.doubts],
      photoUrls: { ...s.photoUrls, ...photoUrls },
    }));
    return id;
  },

  quickCreateDoubt: async () => {
    const now = Date.now();
    const id = crypto.randomUUID();
    const meta: DoubtMeta = {
      id,
      title: "",
      description: "",
      status: "current",
      photoIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveDoubtMeta(meta);
    set((s) => ({
      doubts: [meta, ...s.doubts],
    }));
    return id;
  },

  updateDoubtText: async (id, patch) => {
    const cur = get().doubts.find((d) => d.id === id);
    if (!cur) return;
    const nextSubject =
      patch.subject !== undefined
        ? normalizeStoredDoubtSubject(patch.subject)
        : normalizeStoredDoubtSubject(cur.subject);
    const nextTopic =
      patch.topic !== undefined
        ? normalizeStoredDoubtTopic(patch.topic)
        : normalizeStoredDoubtTopic(cur.topic);
    const next: DoubtMeta = {
      ...cur,
      title:
        patch.title !== undefined ? patch.title.trim() : cur.title,
      description:
        patch.description !== undefined ? patch.description.trim() : cur.description,
      updatedAt: Date.now(),
    };
    if (nextSubject) next.subject = nextSubject;
    else delete next.subject;
    if (nextTopic) next.topic = nextTopic;
    else delete next.topic;
    await saveDoubtMeta(next);
    set((s) => ({
      doubts: s.doubts.map((d) => (d.id === id ? next : d)),
    }));
  },

  setDoubtStatus: async (id, status) => {
    const cur = get().doubts.find((d) => d.id === id);
    if (!cur) return;
    const next: DoubtMeta = {
      ...cur,
      status,
      updatedAt: Date.now(),
    };
    await saveDoubtMeta(next);
    set((s) => ({
      doubts: s.doubts.map((d) => (d.id === id ? next : d)),
    }));
  },

  addPhoto: async (doubtId, file) => {
    if (!isLikelyImageFile(file)) return;
    const cur = get().doubts.find((d) => d.id === doubtId);
    if (!cur) return;
    const pid = await addDoubtPhotoFromFile(doubtId, file);
    const next: DoubtMeta = {
      ...cur,
      photoIds: [...cur.photoIds, pid],
      updatedAt: Date.now(),
    };
    await saveDoubtMeta(next);
    const url = await getDoubtPhoto(doubtId, pid);
    set((s) => ({
      doubts: s.doubts.map((d) => (d.id === doubtId ? next : d)),
      photoUrls: url
        ? { ...s.photoUrls, [cacheKey(doubtId, pid)]: url }
        : s.photoUrls,
    }));
  },

  removePhoto: async (doubtId, photoId) => {
    const cur = get().doubts.find((d) => d.id === doubtId);
    if (!cur) return;
    await deleteDoubtPhoto(doubtId, photoId);
    const next: DoubtMeta = {
      ...cur,
      photoIds: cur.photoIds.filter((p) => p !== photoId),
      updatedAt: Date.now(),
    };
    await saveDoubtMeta(next);
    set((s) => {
      const urls = { ...s.photoUrls };
      delete urls[cacheKey(doubtId, photoId)];
      return {
        doubts: s.doubts.map((d) => (d.id === doubtId ? next : d)),
        photoUrls: urls,
      };
    });
  },

  deleteDoubt: async (id) => {
    const cur = get().doubts.find((d) => d.id === id);
    if (!cur) return;
    const snapshot: { doubts: DoubtMeta[]; photoUrls: PhotoUrlCache } = {
      doubts: [...get().doubts],
      photoUrls: { ...get().photoUrls },
    };
    set((s) => {
      const photoUrls = { ...s.photoUrls };
      for (const pid of cur.photoIds) {
        delete photoUrls[cacheKey(id, pid)];
      }
      return {
        doubts: s.doubts.filter((d) => d.id !== id),
        photoUrls,
      };
    });
    try {
      await deleteDoubtFully(cur);
    } catch {
      set({
        doubts: snapshot.doubts,
        photoUrls: snapshot.photoUrls,
      });
      throw new Error("Could not delete doubt on this device.");
    }
  },

  restoreDoubt: async (meta, photoDataUrls) => {
    await restoreDoubtFully(meta, photoDataUrls);
    const urls: PhotoUrlCache = { ...get().photoUrls };
    for (const pid of meta.photoIds) {
      const u = photoDataUrls[pid];
      if (u) urls[cacheKey(meta.id, pid)] = u;
    }
    set((s) => ({
      doubts: [meta, ...s.doubts.filter((d) => d.id !== meta.id)].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      ),
      photoUrls: urls,
    }));
  },
}));
