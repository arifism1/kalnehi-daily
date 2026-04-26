"use client";

import { Camera, Loader2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { DoubtSubjectSelect } from "@/components/doubts/DoubtSubjectSelect";
import { LocalPhotoPrivacyNote } from "@/components/ui/LocalPhotoPrivacyNote";
import { isLikelyImageFile } from "@/lib/purposeStorage";
import { useDoubtStore } from "@/store/useDoubtStore";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";

type PendingPhoto = { file: File; url: string };

function revokeAll(pending: PendingPhoto[]) {
  for (const p of pending) {
    URL.revokeObjectURL(p.url);
  }
}

export type AddDoubtSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Flat labeled subject list (all exams merged) for the subject select. */
  syllabusSubjects: string[];
  /**
   * Per-exam subject breakdown. When provided and length > 1, an exam picker
   * is shown that filters the subject list to that exam.
   */
  subjectsByExam?: { examLabel: string; examDisplay: string; subjects: string[] }[];
};

export function AddDoubtSheet({
  open,
  onClose,
  syllabusSubjects,
  subjectsByExam,
}: AddDoubtSheetProps) {
  const baseId = useId();
  const createDoubt = useDoubtStore((s) => s.createDoubt);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMultiExam = (subjectsByExam?.length ?? 0) > 1;

  const [selectedExamLabel, setSelectedExamLabel] = useState<string>("__all__");

  const activeSubjects = useMemo(() => {
    if (!isMultiExam || selectedExamLabel === "__all__") return syllabusSubjects;
    const entry = subjectsByExam?.find((e) => e.examLabel === selectedExamLabel);
    if (!entry) return syllabusSubjects;
    const out = [...entry.subjects];
    if (!out.includes("General")) out.push("General");
    return out;
  }, [isMultiExam, selectedExamLabel, subjectsByExam, syllabusSubjects]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [showPhotoPrivacy, setShowPhotoPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setDescription("");
    setSubject("");
    setSelectedExamLabel("__all__");
    setShowPhotoPrivacy(false);
    setError(null);
    setSaving(false);
    setPending((prev) => {
      revokeAll(prev);
      return [];
    });
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    const id = requestAnimationFrame(() => {
      titleRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, reset]);

  const canSave =
    title.trim().length > 0 ||
    description.trim().length > 0 ||
    pending.length > 0;

  const handleClose = useCallback(() => {
    if (saving) return;
    reset();
    onClose();
  }, [onClose, reset, saving]);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const next: PendingPhoto[] = [];
    for (const file of Array.from(files)) {
      if (!isLikelyImageFile(file)) continue;
      next.push({ file, url: URL.createObjectURL(file) });
    }
    if (next.length) {
      setPending((p) => [...p, ...next]);
    }
  }, []);

  const removePending = useCallback((index: number) => {
    setPending((p) => {
      const row = p[index];
      if (row) URL.revokeObjectURL(row.url);
      return p.filter((_, i) => i !== index);
    });
  }, []);

  const onAddPhotoClick = useCallback(() => {
    setShowPhotoPrivacy(true);
    fileInputRef.current?.click();
  }, []);

  const save = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const resolvedExamKey = isMultiExam && selectedExamLabel !== "__all__"
        ? selectedExamLabel
        : null;
      await createDoubt({
        title: title.trim(),
        description: description.trim(),
        initialFiles: pending.map((p) => p.file),
        subject: subject.trim() === "" ? null : subject.trim(),
        examKey: resolvedExamKey,
      });
      reset();
      onClose();
    } catch (e) {
      setError(surfaceErrorForUi(e));
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    saving,
    isMultiExam,
    selectedExamLabel,
    createDoubt,
    title,
    description,
    subject,
    pending,
    onClose,
    reset,
  ]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${baseId}-add-title`}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/65"
        onClick={handleClose}
        disabled={saving}
      />
      <div className="kal-glass-panel relative z-[61] flex min-h-0 max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[min(88dvh,38rem)] sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-kal-border px-5 pb-3 pt-4">
          <h2
            id={`${baseId}-add-title`}
            className="text-lg font-bold tracking-tight text-kal-text"
          >
            New doubt
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-2 text-kal-muted transition-colors hover:bg-kal-card-muted disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-kal-muted">
            What’s the doubt?
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={3}
              placeholder="Type here — question, topic, or screenshot context…"
              autoComplete="off"
              className="mt-2 w-full resize-y rounded-xl border border-kal-border bg-kal-input-bg px-3 py-3 text-base leading-relaxed text-kal-text outline-none placeholder:text-kal-muted focus-visible:ring-2 focus-visible:ring-kal-accent/40"
            />
          </label>

          <label className="mt-4 block text-[11px] font-medium uppercase tracking-wide text-kal-muted">
            Extra detail (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Steps you tried, page number, etc."
              className="mt-2 w-full resize-y rounded-xl border border-kal-border bg-kal-input-bg px-3 py-3 text-base leading-relaxed text-kal-text outline-none placeholder:text-kal-muted focus-visible:ring-2 focus-visible:ring-kal-accent/40"
            />
          </label>

          {isMultiExam && subjectsByExam && (
            <div className="mt-4">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-kal-muted mb-1.5">
                Exam (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedExamLabel("__all__"); setSubject(""); }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedExamLabel === "__all__"
                      ? "border-kal-accent bg-kal-accent text-kal-accent-foreground"
                      : "border-kal-border bg-kal-card/40 text-kal-muted hover:border-kal-accent/50 hover:text-kal-text"
                  }`}
                >
                  All exams
                </button>
                {subjectsByExam.map((e) => (
                  <button
                    key={e.examLabel}
                    type="button"
                    onClick={() => { setSelectedExamLabel(e.examLabel); setSubject(""); }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      selectedExamLabel === e.examLabel
                        ? "border-kal-accent bg-kal-accent text-kal-accent-foreground"
                        : "border-kal-border bg-kal-card/40 text-kal-muted hover:border-kal-accent/50 hover:text-kal-text"
                    }`}
                  >
                    {e.examDisplay}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DoubtSubjectSelect
            id={`${baseId}-subject`}
            className="mt-4"
            value={subject}
            onChange={setSubject}
            options={activeSubjects}
            disabled={saving}
          />

          <div className="mt-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {showPhotoPrivacy ? (
              <LocalPhotoPrivacyNote className="mb-3 max-w-none" />
            ) : null}
            <button
              type="button"
              onClick={onAddPhotoClick}
              disabled={saving}
              className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-kal-accent/30 bg-kal-accent-soft px-4 py-3 text-sm font-semibold text-kal-accent-dark transition hover:border-kal-accent/45 hover:bg-kal-accent/10 disabled:opacity-50 dark:hover:bg-kal-accent-soft/20 dark:hover:text-kal-accent"
            >
              <Camera className="h-5 w-5 shrink-0" aria-hidden />
              <span>📸 Add photo</span>
            </button>

            {pending.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {pending.map((p, i) => (
                  <li
                    key={`${p.url}-${i}`}
                    className="relative overflow-hidden rounded-lg border border-kal-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt=""
                      className="h-20 w-20 object-cover sm:h-24 sm:w-24"
                    />
                    <button
                      type="button"
                      onClick={() => removePending(i)}
                      className="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] px-3 py-2 text-xs text-[var(--kal-danger-text)]"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-kal-border px-5 py-4">
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => void save()}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent py-3 text-sm font-semibold text-kal-accent-foreground shadow-sm transition hover:bg-kal-accent-hover disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save doubt"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
