"use client";

import clsx from "clsx";
import {
  Camera,
  CircleHelp,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { DoubtStatus } from "@/lib/doubtStorage";
import { isLikelyImageFile } from "@/lib/purposeStorage";
import { useDoubtStore } from "@/store/useDoubtStore";
import { useUndoStore } from "@/store/useUndoStore";
import { AddDoubtSheet } from "@/components/doubts/AddDoubtSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LocalPhotoPrivacyNote } from "@/components/ui/LocalPhotoPrivacyNote";
import { TransientNotice } from "@/components/ui/TransientNotice";

type ColumnDef = {
  status: DoubtStatus;
  title: string;
  empty: string;
  panelClass: string;
  headingClass: string;
};

const COLUMNS: ColumnDef[] = [
  {
    status: "current",
    title: "Current Doubts",
    empty: "No active doubts — keep conquering the syllabus",
    panelClass: "border-slate-700/90 bg-slate-900/35",
    headingClass: "text-slate-200",
  },
  {
    status: "working",
    title: "Working on it",
    empty:
      "Nothing here yet — move a doubt here when you start breaking it down",
    panelClass: "border-violet-500/25 bg-violet-950/15",
    headingClass: "text-violet-200/95",
  },
  {
    status: "solved",
    title: "Solved Doubts",
    empty: "All doubts solved — great progress!",
    panelClass: "border-emerald-500/35 bg-emerald-950/20",
    headingClass: "text-emerald-200/95",
  },
];

function usePhotoUrl(doubtId: string, photoId: string) {
  const url = useDoubtStore(
    (s) => s.photoUrls[`${doubtId}::${photoId}`],
  );
  return url;
}

function DoubtPhotoThumb({
  doubtId,
  photoId,
  onRemove,
}: {
  doubtId: string;
  photoId: string;
  onRemove?: () => void;
}) {
  const url = usePhotoUrl(doubtId, photoId);
  if (!url) return null;
  return (
    <div className="group/thumb relative inline-block overflow-hidden rounded-lg border border-slate-700/80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="h-16 w-16 object-cover sm:h-20 sm:w-20"
      />
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100"
          aria-label="Remove photo"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function DoubtTracker() {
  const baseId = useId();
  const {
    doubts,
    hydrated,
    hydrateError,
    hydrate,
    updateDoubtText,
    setDoubtStatus,
    addPhoto,
    removePhoto,
    deleteDoubt,
    restoreDoubt,
  } = useDoubtStore();

  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editPhotoHint, setEditPhotoHint] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState<DoubtStatus | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteBanner, setDeleteBanner] = useState<string | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (editingId && !doubts.some((d) => d.id === editingId)) {
      setEditingId(null);
    }
  }, [editingId, doubts]);

  useEffect(() => {
    setEditPhotoHint(false);
  }, [editingId]);

  const byStatus = useMemo(() => {
    const m: Record<DoubtStatus, typeof doubts> = {
      current: [],
      working: [],
      solved: [],
    };
    for (const d of doubts) {
      m[d.status].push(d);
    }
    for (const k of Object.keys(m) as DoubtStatus[]) {
      m[k].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return m;
  }, [doubts]);

  const editing = editingId
    ? doubts.find((d) => d.id === editingId)
    : undefined;

  useEffect(() => {
    if (editing) {
      setEditTitle(editing.title);
      setEditDesc(editing.description);
    }
  }, [editing]);

  const saveEdit = async () => {
    if (!editingId) return;
    setEditSaving(true);
    try {
      await updateDoubtText(editingId, {
        title: editTitle,
        description: editDesc,
      });
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="h-9 w-9 animate-spin text-emerald-500/80" />
        <p className="text-sm">Loading your doubts…</p>
      </div>
    );
  }

  if (hydrateError) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-slate-900/60 px-4 py-3 text-xs leading-relaxed text-slate-400">
        {hydrateError}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 pb-6 sm:space-y-6 sm:pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 sm:h-11 sm:w-11 sm:rounded-xl">
              <CircleHelp className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-emerald-400/90 sm:text-[0.65rem] sm:tracking-widest">
                Exam prep
              </p>
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl md:text-2xl">
                Doubt Tracker
              </h1>
            </div>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-zinc-500 sm:text-sm">
            Capture doubts with notes and screenshots — private on this device,
            for your eyes only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddSheetOpen(true)}
          className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-emerald-900/35 transition hover:bg-emerald-500 active:scale-[0.99] sm:min-h-[52px] sm:w-auto sm:min-w-[12.5rem] sm:rounded-2xl sm:px-6 sm:py-3.5 sm:text-sm"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
          Add doubt
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:gap-4 md:grid md:grid-cols-3 md:items-start md:gap-5 lg:gap-6 xl:gap-8">
        {COLUMNS.map((col) => (
          <section
            key={col.status}
            className={clsx(
              "flex min-h-0 min-w-0 flex-col rounded-xl border p-3 shadow-sm shadow-black/20 sm:rounded-2xl sm:p-4 md:min-h-[min(32rem,calc(100dvh-13rem))] lg:p-5",
              col.panelClass,
              dragOver === col.status && "ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-[#020617]",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOver(col.status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/doubt-id");
              if (id) void setDoubtStatus(id, col.status);
            }}
          >
            <h2
              className={clsx(
                "shrink-0 border-b border-white/[0.06] pb-2 text-xs font-bold tracking-tight sm:pb-3 sm:text-sm",
                col.headingClass,
              )}
            >
              {col.title}
            </h2>
            <div className="mt-2 flex min-h-[8rem] flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch] sm:mt-3 sm:min-h-[10rem] sm:gap-2.5 md:min-h-0 md:max-h-[calc(100dvh-15.5rem)] lg:max-h-[calc(100dvh-14rem)]">
              {byStatus[col.status].length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/30 px-2.5 py-6 text-center text-[11px] leading-relaxed text-zinc-500 sm:rounded-xl sm:px-3 sm:py-8 sm:text-[12px]">
                  {col.empty}
                </p>
              ) : (
                byStatus[col.status].map((d) => (
                  <article
                    key={d.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/doubt-id", d.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="group relative cursor-grab rounded-lg border border-slate-800/90 bg-slate-950/60 p-2.5 shadow-sm transition hover:border-slate-700 active:cursor-grabbing sm:rounded-xl sm:p-3 lg:p-3.5"
                  >
                    <div className="flex gap-1.5 sm:gap-2">
                      <div
                        className="mt-px shrink-0 text-zinc-600 sm:mt-0.5"
                        aria-hidden
                      >
                        <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0 flex-1 pr-9 sm:pr-11">
                        <button
                          type="button"
                          onClick={() => setEditingId(d.id)}
                          className="w-full text-left"
                        >
                          <p className="text-sm font-semibold leading-snug text-white sm:text-[15px]">
                            {d.title.trim() ? (
                              d.title
                            ) : (
                              <span className="font-medium text-zinc-500">
                                Untitled
                              </span>
                            )}
                          </p>
                          {d.description.trim() ? (
                            <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed text-zinc-400 sm:mt-1 sm:text-[12px]">
                              {d.description}
                            </p>
                          ) : null}
                        </button>
                        {d.photoIds.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {d.photoIds.map((pid) => (
                              <button
                                key={pid}
                                type="button"
                                className="overflow-hidden rounded-lg ring-1 ring-slate-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const u =
                                    useDoubtStore.getState().photoUrls[
                                      `${d.id}::${pid}`
                                    ];
                                  if (u) setLightbox(u);
                                }}
                              >
                                <DoubtPhotoThumb doubtId={d.id} photoId={pid} />
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDeleteId(d.id);
                          }}
                          className="absolute right-1 top-1 flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-rose-400/90 opacity-100 transition-opacity hover:bg-rose-950/50 hover:text-rose-300 sm:right-2 sm:top-2 sm:h-10 sm:w-10 sm:min-h-0 sm:min-w-0 sm:rounded-xl md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                          aria-label="Delete doubt"
                        >
                          <Trash2 className="h-5 w-5" strokeWidth={2.25} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <TransientNotice
        message={deleteBanner}
        onDismiss={() => setDeleteBanner(null)}
        variant="amber"
      />
      <TransientNotice
        message={inlineNotice}
        onDismiss={() => setInlineNotice(null)}
        variant="amber"
      />

      <p className="text-center text-[10px] leading-relaxed text-zinc-600 sm:text-[11px]">
        Drag cards between columns to update status. Tap a card to edit. Stored
        on this device only.
      </p>

      <ConfirmDialog
        open={pendingDeleteId != null}
        title="Delete doubt?"
        description="Delete this doubt permanently?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        busy={deleteBusy}
        onCancel={() => !deleteBusy && setPendingDeleteId(null)}
        onConfirm={() => {
          const id = pendingDeleteId;
          if (!id) return;
          const meta = doubts.find((d) => d.id === id);
          if (!meta) {
            setPendingDeleteId(null);
            return;
          }
          const urls = useDoubtStore.getState().photoUrls;
          const photoDataUrls: Record<string, string> = {};
          for (const pid of meta.photoIds) {
            const u = urls[`${meta.id}::${pid}`];
            if (u) photoDataUrls[pid] = u;
          }
          setDeleteBusy(true);
          setDeleteBanner(null);
          void (async () => {
            try {
              await deleteDoubt(id);
              setEditingId((prev) => (prev === id ? null : prev));
              setPendingDeleteId(null);
              useUndoStore.getState().offerUndo({
                message: "Doubt removed",
                runUndo: async () => {
                  await restoreDoubt(meta, photoDataUrls);
                },
              });
            } catch {
              setDeleteBanner(
                "Could not delete this doubt. Please try again.",
              );
              setPendingDeleteId(null);
            } finally {
              setDeleteBusy(false);
            }
          })();
        }}
      />

      {/* Edit */}
      {editing && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${baseId}-edit-title`}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/65"
            onClick={() => !editSaving && setEditingId(null)}
          />
          <div className="relative z-[61] max-h-[min(92vh,36rem)] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-700 bg-[#0c1220] p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-2">
              <h2
                id={`${baseId}-edit-title`}
                className="text-lg font-bold text-white"
              >
                Edit doubt
              </h2>
              <button
                type="button"
                onClick={() => !editSaving && setEditingId(null)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-4 block text-xs font-medium text-zinc-400">
              Title
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-[15px] text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              />
            </label>
            <label className="mt-4 block text-xs font-medium text-zinc-400">
              Details
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={5}
                className="mt-1.5 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-[15px] text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              />
            </label>
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-400">Photos</p>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                aria-hidden
                onChange={(e) => {
                  const files = e.target.files;
                  e.target.value = "";
                  if (!files?.length || !editing) return;
                  for (const f of Array.from(files)) {
                    if (isLikelyImageFile(f)) void addPhoto(editing.id, f);
                  }
                }}
              />
              {editPhotoHint ? (
                <LocalPhotoPrivacyNote className="mt-2" />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setEditPhotoHint(true);
                  editFileInputRef.current?.click();
                }}
                disabled={editSaving}
                className="mt-2 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-950/40 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-950/55 disabled:opacity-50"
              >
                <Camera className="h-5 w-5 shrink-0" aria-hidden />
                <span>📸 Add photo</span>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                {editing.photoIds.map((pid) => (
                  <DoubtPhotoThumb
                    key={pid}
                    doubtId={editing.id}
                    photoId={pid}
                    onRemove={() => void removePhoto(editing.id, pid)}
                  />
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => void saveEdit()}
                className="min-h-[48px] flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {editSaving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setPendingDeleteId(editing.id)}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 py-3 text-sm font-semibold text-rose-200"
              >
                <Trash2 className="h-4 w-4" />
                Delete doubt
              </button>
            </div>
          </div>
        </div>
      )}

      <AddDoubtSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
      />

      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          role="presentation"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
