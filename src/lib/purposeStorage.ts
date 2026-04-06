/**
 * Local-only purpose images: compressed Base64 data URLs in IndexedDB (never Supabase).
 */

import { openDB, type DBSchema } from "idb";

const DB_NAME = "kalnehi-purpose";
/** v2: `purpose_images` uses `keyPath: 'slot'` so `put(value)` is valid (v1 out-of-line + explicit key conflicted with some browsers / prior states). */
const DB_VERSION = 2;
export const PURPOSE_IMAGES_STORE = "purpose_images" as const;

export const MAX_PURPOSE_PHOTOS = 3;

export type PurposeSlot = 0 | 1 | 2;

export type PurposeImageRecord = {
  slot: PurposeSlot;
  /** image/jpeg data URL (Base64 payload) */
  dataUrl: string;
  label: string;
  updatedAt: number;
};

interface PurposeDBSchema extends DBSchema {
  purpose_images: {
    key: PurposeSlot;
    value: PurposeImageRecord;
  };
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kalnehi-purpose-images-changed"));
}

async function getDb() {
  return openDB<PurposeDBSchema>(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion >= 2) return;

      const migrated: PurposeImageRecord[] = [];

      if (db.objectStoreNames.contains(PURPOSE_IMAGES_STORE)) {
        const oldStore = transaction.objectStore(PURPOSE_IMAGES_STORE);
        for (let s = 0; s < MAX_PURPOSE_PHOTOS; s++) {
          const slot = s as PurposeSlot;
          try {
            const v: unknown = await oldStore.get(slot);
            if (
              v &&
              typeof v === "object" &&
              "dataUrl" in v &&
              typeof (v as { dataUrl: unknown }).dataUrl === "string"
            ) {
              const r = v as {
                dataUrl: string;
                label?: string;
                updatedAt?: number;
                slot?: PurposeSlot;
              };
              migrated.push({
                slot: r.slot ?? slot,
                dataUrl: r.dataUrl,
                label:
                  typeof r.label === "string" && r.label.trim()
                    ? r.label
                    : defaultLabelForSlot(slot),
                updatedAt:
                  typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
              });
            }
          } catch {
            /* skip corrupt slot */
          }
        }
        db.deleteObjectStore(PURPOSE_IMAGES_STORE);
      }

      const store = db.createObjectStore(PURPOSE_IMAGES_STORE, {
        keyPath: "slot",
      });
      for (const row of migrated) {
        await store.put(row);
      }
    },
  });
}

/**
 * True when the file is an image we should try to load. Mobile Safari often leaves `type` empty for camera/library picks.
 */
export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (!file.type) return true;
  if (file.type === "application/octet-stream") {
    return /\.(jpe?g|png|gif|webp|heic|heif|bmp|tif|avif)$/i.test(
      file.name,
    );
  }
  return false;
}

function drawToJpegDataUrl(
  source: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
  opts?: { maxWidth?: number; quality?: number },
): string {
  const maxWidth = opts?.maxWidth ?? 960;
  const quality = opts?.quality ?? 0.82;
  const scale = Math.min(1, maxWidth / naturalWidth);
  const w = Math.max(1, Math.round(naturalWidth * scale));
  const h = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");

  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * HEIC and some library picks fail `createImageBitmap` on iOS; `<img>` + canvas usually decodes via the browser.
 */
async function compressViaImageElement(
  file: File,
  opts?: { maxWidth?: number; quality?: number },
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = url;
    });
    return drawToJpegDataUrl(img, img.naturalWidth, img.naturalHeight, opts);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Load a file, draw to canvas, re-encode as JPEG to shrink size before Base64 storage.
 */
export async function compressImageFileToDataUrl(
  file: File,
  opts?: { maxWidth?: number; quality?: number },
): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      return drawToJpegDataUrl(bitmap, bitmap.width, bitmap.height, opts);
    } finally {
      bitmap.close();
    }
  } catch {
    return compressViaImageElement(file, opts);
  }
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
  await db.put(PURPOSE_IMAGES_STORE, {
    slot,
    dataUrl,
    label: label.trim() || defaultLabelForSlot(slot),
    updatedAt: Date.now(),
  });
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

export async function getAllPurposeImages(): Promise<PurposeImageRecord[]> {
  const out: PurposeImageRecord[] = [];
  for (let i = 0; i < MAX_PURPOSE_PHOTOS; i++) {
    const row = await getPurposeImage(i as PurposeSlot);
    if (row) out.push(row);
  }
  return out;
}

export async function deletePurposeImage(slot: PurposeSlot): Promise<void> {
  const db = await getDb();
  await db.delete(PURPOSE_IMAGES_STORE, slot);
  notifyChanged();
}
