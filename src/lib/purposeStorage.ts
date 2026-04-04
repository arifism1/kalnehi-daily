/**
 * Local-only purpose images: compressed Base64 data URLs in IndexedDB (never Supabase).
 */

import { openDB, type DBSchema } from "idb";

const DB_NAME = "kalnehi-purpose";
const DB_VERSION = 1;
export const PURPOSE_IMAGES_STORE = "purpose_images" as const;

export const MAX_PURPOSE_PHOTOS = 3;

export type PurposeSlot = 0 | 1 | 2;

export type PurposeImageRecord = {
  /** image/jpeg data URL (Base64 payload) */
  dataUrl: string;
  label: string;
  updatedAt: number;
};

interface PurposeDBSchema extends DBSchema {
  purpose_images: {
    key: number;
    value: PurposeImageRecord;
  };
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kalnehi-purpose-images-changed"));
}

async function getDb() {
  return openDB<PurposeDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(PURPOSE_IMAGES_STORE)) {
        db.createObjectStore(PURPOSE_IMAGES_STORE);
      }
    },
  });
}

/**
 * Load a file, draw to canvas, re-encode as JPEG to shrink size before Base64 storage.
 */
export async function compressImageFileToDataUrl(
  file: File,
  opts?: { maxWidth?: number; quality?: number },
): Promise<string> {
  const maxWidth = opts?.maxWidth ?? 960;
  const quality = opts?.quality ?? 0.82;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Compress then persist one slot (replaces existing).
 */
export async function savePurposeImageFromFile(
  slot: PurposeSlot,
  file: File,
  label: string,
): Promise<void> {
  const dataUrl = await compressImageFileToDataUrl(file);
  await savePurposeImageDataUrl(slot, dataUrl, label);
}

export async function savePurposeImageDataUrl(
  slot: PurposeSlot,
  dataUrl: string,
  label: string,
): Promise<void> {
  const db = await getDb();
  await db.put(
    PURPOSE_IMAGES_STORE,
    {
      dataUrl,
      label: label.trim() || defaultLabelForSlot(slot),
      updatedAt: Date.now(),
    },
    slot,
  );
  notifyChanged();
}

export function defaultLabelForSlot(slot: PurposeSlot): string {
  const labels = ["Parents", "Dream College", "Your why"];
  return labels[slot] ?? `Photo ${slot + 1}`;
}

export async function getPurposeImage(
  slot: PurposeSlot,
): Promise<PurposeImageRecord | undefined> {
  const db = await getDb();
  return db.get(PURPOSE_IMAGES_STORE, slot);
}

export async function getAllPurposeImages(): Promise<
  Array<PurposeImageRecord & { slot: PurposeSlot }>
> {
  const out: Array<PurposeImageRecord & { slot: PurposeSlot }> = [];
  for (let i = 0; i < MAX_PURPOSE_PHOTOS; i++) {
    const row = await getPurposeImage(i as PurposeSlot);
    if (row) out.push({ ...row, slot: i as PurposeSlot });
  }
  return out;
}

export async function deletePurposeImage(slot: PurposeSlot): Promise<void> {
  const db = await getDb();
  await db.delete(PURPOSE_IMAGES_STORE, slot);
  notifyChanged();
}
