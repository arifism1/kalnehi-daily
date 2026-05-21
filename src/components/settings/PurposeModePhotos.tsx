"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";
import { LocalPhotoPrivacyNote } from "@/components/ui/LocalPhotoPrivacyNote";
import {
  defaultLabelForSlot,
  deletePurposeImage,
  getPurposeImage,
  isLikelyImageFile,
  type PurposeSlot,
  savePurposeImageDataUrl,
  savePurposeImageFromFile,
} from "@/lib/purposeStorage";

const SLOTS: PurposeSlot[] = [0, 1, 2];

async function loadPreviewMap(): Promise<
  Record<number, { dataUrl: string; label: string } | null>
> {
  const next: Record<number, { dataUrl: string; label: string } | null> = {};
  for (const slot of SLOTS) {
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- SLOTS is tiny (≤5); sequential IDB reads are acceptable here
    const row = await getPurposeImage(slot);
    next[slot] = row ? { dataUrl: row.dataUrl, label: row.label } : null;
  }
  return next;
}

export function PurposeModePhotos() {
  const baseId = useId();
  const [previews, setPreviews] = useState<
    Record<number, { dataUrl: string; label: string } | null>
  >({});
  const [draftLabels, setDraftLabels] = useState<Record<number, string>>({});
  /** In-flight label edits before blur commit */
  const [shadowLabel, setShadowLabel] = useState<
    Record<number, string | undefined>
  >({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setPreviews(await loadPreviewMap());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadPreviewMap().then((next) => {
      if (!cancelled) setPreviews(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const labelFor = (slot: PurposeSlot) => {
    if (shadowLabel[slot] !== undefined) return shadowLabel[slot]!;
    const row = previews[slot];
    if (row?.dataUrl) return row.label;
    return draftLabels[slot] ?? defaultLabelForSlot(slot);
  };

  const onPickFile = async (slot: PurposeSlot, file: File | null) => {
    if (!file || !isLikelyImageFile(file)) {
      if (file && !isLikelyImageFile(file)) {
        setSaveError("Please choose an image file.");
      }
      return;
    }
    setSaveError(null);
    try {
      await savePurposeImageFromFile(slot, file, labelFor(slot));
      await refresh();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not save photo on this device.";
      setSaveError(msg);
    }
  };

  const onLabelInput = (slot: PurposeSlot, label: string) => {
    const row = previews[slot];
    if (!row?.dataUrl) {
      setDraftLabels((d) => ({ ...d, [slot]: label }));
      return;
    }
    setShadowLabel((s) => ({ ...s, [slot]: label }));
  };

  const onLabelBlur = async (slot: PurposeSlot) => {
    const row = previews[slot];
    const v = shadowLabel[slot];
    setShadowLabel((s) => {
      const n = { ...s };
      delete n[slot];
      return n;
    });
    if (!row?.dataUrl || v === undefined || v === row.label) return;
    await savePurposeImageDataUrl(slot, row.dataUrl, v);
    await refresh();
  };

  const onRemove = async (slot: PurposeSlot) => {
    await deletePurposeImage(slot);
    setDraftLabels((d) => {
      const n = { ...d };
      delete n[slot];
      return n;
    });
    await refresh();
  };

  return (
    <div className="rounded-2xl border border-kal-border bg-kal-card p-4 kal-shadow-card">
      <p className="text-base font-semibold text-kal-text">Purpose photos</p>
      <div className="mt-2">
        <SettingsExpandableSection
          sectionId="purpose-photos"
          title="Manage your motivation images"
          description="Up to three images for your home motivation strip."
        >
          <LocalPhotoPrivacyNote className="max-w-xl" />
          {saveError ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-kal-danger-border bg-kal-danger-soft px-3 py-2 text-xs text-kal-danger-text"
            >
              {saveError}
            </p>
          ) : null}
          <ul className="mt-4 space-y-4">
            {SLOTS.map((slot) => {
              const row = previews[slot];
              const inputId = `${baseId}-file-${slot}`;
              return (
                <li
                  key={slot}
                  className="flex flex-col gap-2 rounded-xl border border-kal-border bg-kal-card-muted p-3 sm:flex-row sm:items-stretch"
                >
                  <label
                    htmlFor={inputId}
                    className="relative flex min-h-[100px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-kal-border bg-kal-card text-center transition hover:border-kal-accent/40"
                  >
                    {row?.dataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.dataUrl}
                        alt=""
                        className="h-full max-h-[140px] w-full object-cover"
                      />
                    ) : (
                      <span className="flex flex-col items-center gap-1.5 px-2 py-4 text-xs text-kal-text-secondary">
                        <ImagePlus className="size-6 text-kal-muted" />
                        Tap to add
                      </span>
                    )}
                    <input
                      id={inputId}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void onPickFile(slot, f);
                      }}
                    />
                  </label>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <label className="text-[11px] font-medium text-kal-text-secondary">
                      Label
                      <input
                        type="text"
                        value={labelFor(slot)}
                        onChange={(e) => onLabelInput(slot, e.target.value)}
                        onBlur={() => void onLabelBlur(slot)}
                        className="mt-1 w-full rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                        placeholder={defaultLabelForSlot(slot)}
                      />
                    </label>
                    {row?.dataUrl && (
                      <button
                        type="button"
                        onClick={() => void onRemove(slot)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-kal-danger-border bg-kal-danger-soft px-3 py-2 text-xs font-medium text-kal-danger-text transition hover:bg-kal-danger-border/30"
                      >
                        <Trash2 className="size-3.5" />
                        Remove photo
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </SettingsExpandableSection>
      </div>
    </div>
  );
}
