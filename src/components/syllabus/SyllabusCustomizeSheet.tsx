"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  addCustomSyllabusItem,
  editCustomSyllabusItem,
  type EditCustomSyllabusPayload,
} from "@/actions/syllabus";

export type SyllabusCustomizeSheetMode =
  | {
      kind: "add_microtopic";
      examName: string;
      defaultSubject: string;
      defaultChapter: string;
    }
  | {
      kind: "add_chapter_block";
      examName: string;
      defaultSubject: string;
    }
  | {
      kind: "edit_user_microtopic";
      examName: string;
      customizationId: string;
      subject: string;
      chapter: string;
      microtopic: string;
    }
  | {
      kind: "edit_global_microtopic";
      examName: string;
      syllabusMasterId: string;
      subject: string;
      chapter: string;
      microtopic: string;
    }
  | {
      kind: "rename_chapter";
      examName: string;
      subject: string;
      chapterOld: string;
      chapterCurrentLabel: string;
    };

type Props = {
  open: boolean;
  mode: SyllabusCustomizeSheetMode | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function SyllabusCustomizeSheet({
  open,
  mode,
  onClose,
  onSaved,
}: Props) {
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [microtopic, setMicrotopic] = useState("");
  const [chapterNew, setChapterNew] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !mode) return;
    setError(null);
    if (mode.kind === "add_microtopic") {
      setSubject(mode.defaultSubject);
      setChapter(mode.defaultChapter);
      setMicrotopic("");
    } else if (mode.kind === "add_chapter_block") {
      setSubject(mode.defaultSubject);
      setChapter("");
      setMicrotopic("");
    } else if (mode.kind === "edit_user_microtopic") {
      setSubject(mode.subject);
      setChapter(mode.chapter);
      setMicrotopic(mode.microtopic);
    } else if (mode.kind === "edit_global_microtopic") {
      setSubject(mode.subject);
      setChapter(mode.chapter);
      setMicrotopic(mode.microtopic);
    } else if (mode.kind === "rename_chapter") {
      setChapterNew(mode.chapterCurrentLabel);
    }
  }, [open, mode]);

  const submit = useCallback(async () => {
    if (!mode) return;
    setBusy(true);
    setError(null);
    try {
      if (mode.kind === "add_microtopic") {
        const res = await addCustomSyllabusItem({
          examName: mode.examName,
          subject: subject.trim(),
          chapter: chapter.trim(),
          microtopic: microtopic.trim(),
        });
        if (!res.ok) throw new Error(res.error);
      } else if (mode.kind === "add_chapter_block") {
        const res = await addCustomSyllabusItem({
          examName: mode.examName,
          subject: subject.trim(),
          chapter: chapter.trim(),
          microtopic: microtopic.trim() || "Getting started",
        });
        if (!res.ok) throw new Error(res.error);
      } else if (mode.kind === "edit_user_microtopic") {
        const payload: EditCustomSyllabusPayload = {
          examName: mode.examName,
          mode: "user_add",
          customizationId: mode.customizationId,
          subject: subject.trim(),
          chapter: chapter.trim(),
          microtopic: microtopic.trim(),
        };
        const res = await editCustomSyllabusItem(payload);
        if (!res.ok) throw new Error(res.error);
      } else if (mode.kind === "edit_global_microtopic") {
        const payload: EditCustomSyllabusPayload = {
          examName: mode.examName,
          mode: "global_microtopic",
          syllabusMasterId: mode.syllabusMasterId,
          subjectOverride: subject.trim(),
          chapterOverride: chapter.trim(),
          microtopicOverride: microtopic.trim(),
        };
        const res = await editCustomSyllabusItem(payload);
        if (!res.ok) throw new Error(res.error);
      } else if (mode.kind === "rename_chapter") {
        const payload: EditCustomSyllabusPayload = {
          examName: mode.examName,
          mode: "chapter_rename",
          subject: mode.subject,
          chapterOld: mode.chapterOld,
          chapterNew: chapterNew.trim(),
        };
        const res = await editCustomSyllabusItem(payload);
        if (!res.ok) throw new Error(res.error);
      }
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, [mode, subject, chapter, microtopic, chapterNew, onClose, onSaved]);

  if (!open || !mode) return null;

  const title =
    mode.kind === "add_microtopic"
      ? "Add microtopic"
      : mode.kind === "add_chapter_block"
        ? "Add chapter"
        : mode.kind === "edit_user_microtopic"
          ? "Edit your microtopic"
          : mode.kind === "edit_global_microtopic"
            ? "Edit display (your copy)"
            : "Rename chapter";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={busy ? undefined : onClose}
        disabled={busy}
      />
      <div
        className="relative z-[71] max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-[#0c1220] p-5 shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="syllabus-sheet-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="syllabus-sheet-title"
            className="text-lg font-bold tracking-tight text-white"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode.kind === "rename_chapter" ? (
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Renames this chapter for you only. Microtopics stay linked; labels
            update everywhere.
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Changes apply to your syllabus only — the shared catalog stays
            unchanged.
          </p>
        )}

        <div className="mt-5 space-y-4">
          {mode.kind === "rename_chapter" ? (
            <label className="block">
              <span className="text-xs font-medium text-zinc-500">
                New chapter title
              </span>
              <input
                value={chapterNew}
                onChange={(e) => setChapterNew(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-[15px] text-white placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Chapter name"
                autoComplete="off"
              />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">
                  Subject
                </span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={busy}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-[15px] text-white placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">
                  Chapter
                </span>
                <input
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  disabled={busy}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-[15px] text-white placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">
                  Microtopic
                </span>
                <input
                  value={microtopic}
                  onChange={(e) => setMicrotopic(e.target.value)}
                  disabled={busy}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-[15px] text-white placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
            </>
          )}
        </div>

        {error ? (
          <p className="mt-3 text-sm text-rose-300" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-[48px] rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-zinc-200 sm:min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className={clsx(
              "min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold text-white sm:min-h-[44px]",
              "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50",
            )}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
