"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  addCustomSyllabusItem,
  editCustomSyllabusItem,
  type EditCustomSyllabusPayload,
} from "@/actions/syllabus";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";

export type SyllabusCustomizeSheetMode =
  | {
      kind: "add_microtopic";
      examName: string;
      /** Display strings (e.g. after chapter rename). */
      subjectLabel: string;
      chapterLabel: string;
      /** Keys matching syllabus_master for validation and insert. */
      catalogSubject: string;
      catalogChapter: string;
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

function ReadOnlySyllabusPair({
  subject,
  chapter,
}: {
  subject: string;
  chapter: string;
}) {
  return (
    <>
      <div className="block">
        <span className="text-xs font-medium text-kal-muted">Subject</span>
        <div className="mt-1.5 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-base text-kal-text">
          {subject || "—"}
        </div>
      </div>
      <div className="block">
        <span className="text-xs font-medium text-kal-muted">Chapter</span>
        <div className="mt-1.5 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-base text-kal-text">
          {chapter || "—"}
        </div>
      </div>
    </>
  );
}

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
      setSubject(mode.subjectLabel);
      setChapter(mode.chapterLabel);
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
          subject: mode.catalogSubject.trim(),
          chapter: mode.catalogChapter.trim(),
          microtopic: microtopic.trim(),
        });
        if (!res.ok) throw new Error(res.error);
      } else if (mode.kind === "edit_user_microtopic") {
        const payload: EditCustomSyllabusPayload = {
          examName: mode.examName,
          mode: "user_add",
          customizationId: mode.customizationId,
          microtopic: microtopic.trim(),
        };
        const res = await editCustomSyllabusItem(payload);
        if (!res.ok) throw new Error(res.error);
      } else if (mode.kind === "edit_global_microtopic") {
        const payload: EditCustomSyllabusPayload = {
          examName: mode.examName,
          mode: "global_microtopic",
          syllabusMasterId: mode.syllabusMasterId,
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
      setError(surfaceErrorForUi(e));
    } finally {
      setBusy(false);
    }
  }, [mode, microtopic, chapterNew, onClose, onSaved]);

  if (!open || !mode) return null;

  const title =
    mode.kind === "add_microtopic"
      ? "Add microtopic"
      : mode.kind === "edit_user_microtopic"
        ? "Edit your microtopic"
        : mode.kind === "edit_global_microtopic"
          ? "Edit display (your copy)"
          : "Rename chapter";

  const showLockedSubjectChapter =
    mode.kind === "add_microtopic" ||
    mode.kind === "edit_user_microtopic" ||
    mode.kind === "edit_global_microtopic";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-kal-overlay backdrop-blur-[2px]"
        onClick={busy ? undefined : onClose}
        disabled={busy}
      />
      <div
        className="kal-glass-panel relative z-[71] flex min-h-0 w-full max-w-lg max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="syllabus-sheet-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-kal-border/60 px-6 pb-3 pt-6 dark:border-white/10">
          <h2
            id="syllabus-sheet-title"
            className="text-lg font-bold tracking-tight text-kal-text"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2 text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4 [-webkit-overflow-scrolling:touch]">
          {mode.kind === "rename_chapter" ? (
            <p className="text-xs leading-relaxed text-kal-muted">
              Renames this chapter for you only. Microtopics stay linked; labels
              update everywhere.
            </p>
          ) : mode.kind === "add_microtopic" ? (
            <>
              <p className="text-xs leading-relaxed text-kal-muted">
                Changes apply to your syllabus only — the shared catalog stays
                unchanged.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-kal-muted">
                This microtopic is added under the catalog chapter shown above
                (official syllabus structure).
              </p>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-kal-muted">
              Changes apply to your syllabus only — the shared catalog stays
              unchanged.
            </p>
          )}

          <div className="mt-5 space-y-4">
            {mode.kind === "rename_chapter" ? (
              <label className="block">
                <span className="text-xs font-medium text-kal-muted">
                  New chapter title
                </span>
                <input
                  value={chapterNew}
                  onChange={(e) => setChapterNew(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                  placeholder="Chapter name"
                  autoComplete="off"
                />
              </label>
            ) : (
              <>
                {showLockedSubjectChapter ? (
                  <ReadOnlySyllabusPair subject={subject} chapter={chapter} />
                ) : null}
                <label className="block">
                  <span className="text-xs font-medium text-kal-muted">
                    Microtopic
                  </span>
                  <input
                    value={microtopic}
                    onChange={(e) => setMicrotopic(e.target.value)}
                    disabled={busy}
                    className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-kal-border/60 bg-[var(--kal-page)]/95 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm dark:border-white/10">
          {error ? (
            <p className="mb-3 text-sm text-kal-danger-text" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="kal-glass-subtle min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold text-kal-text sm:min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className={clsx(
                "min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold text-kal-accent-foreground sm:min-h-[44px]",
                "bg-kal-accent hover:bg-kal-accent-hover disabled:opacity-50",
              )}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
