"use client";

import { Camera, Loader2, Mic, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DoubtSubjectSelect } from "@/components/doubts/DoubtSubjectSelect";
import { DoubtTopicSelect } from "@/components/doubts/DoubtTopicSelect";
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

export type VoiceDoubtPreviewSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Model id returned by the tagging API (e.g. llama-3.1-8b-instant). */
  groqModel: string;
  /** Optional server note when tagging fell back. */
  tagNote?: string | null;
  /** Seconds billed toward voice quota for this capture. */
  voiceSecondsCharged?: number | null;
  initialTitle: string;
  initialSubject: string;
  initialTopic: string;
  syllabusSubjects: string[];
  linesForSubject: (subject: string) => string[];
};

export function VoiceDoubtPreviewSheet({
  open,
  onClose,
  groqModel,
  tagNote,
  voiceSecondsCharged,
  initialTitle,
  initialSubject,
  initialTopic,
  syllabusSubjects,
  linesForSubject,
}: VoiceDoubtPreviewSheetProps) {
  const baseId = "voice-doubt-preview";
  const createDoubt = useDoubtStore((s) => s.createDoubt);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [showPhotoPrivacy, setShowPhotoPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setSubject("");
    setTopic("");
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
    setTitle(initialTitle);
    setSubject(initialSubject);
    setTopic(initialTopic);
    const id = requestAnimationFrame(() => {
      titleRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, initialTitle, initialSubject, initialTopic, reset]);

  const topicOptions = useMemo(
    () => linesForSubject(subject),
    [linesForSubject, subject],
  );

  useEffect(() => {
    if (!topic) return;
    if (topicOptions.length > 0 && !topicOptions.includes(topic)) {
      setTopic("");
    }
  }, [topic, topicOptions]);

  const canSave =
    title.trim().length > 0 ||
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

  const save = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createDoubt({
        title: title.trim(),
        description: "",
        initialFiles: pending.map((p) => p.file),
        subject: subject.trim() === "" ? null : subject.trim(),
        topic: topic.trim() === "" ? null : topic.trim(),
      });
      reset();
      onClose();
    } catch (e) {
      setError(surfaceErrorForUi(e));
    } finally {
      setSaving(false);
    }
  }, [canSave, saving, createDoubt, title, subject, topic, pending, onClose, reset]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${baseId}-title`}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/65"
        onClick={handleClose}
        disabled={saving}
      />
      <div className="kal-glass-panel relative z-[66] flex min-h-0 max-h-[min(92dvh,42rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[min(90dvh,40rem)] sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-kal-border px-5 pb-3 pt-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-kal-accent">
              <Mic className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Voice doubt
            </p>
            <h2
              id={`${baseId}-title`}
              className="text-lg font-bold tracking-tight text-kal-text"
            >
              Review and save
            </h2>
            {groqModel ? (
              <p className="mt-0.5 text-[10px] text-kal-muted">
                Tagged with{" "}
                <span className="font-mono text-kal-text-secondary">
                  {groqModel}
                </span>
              </p>
            ) : null}
            {tagNote ? (
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300/95">
                {tagNote}
              </p>
            ) : null}
            {typeof voiceSecondsCharged === "number" ? (
              <p className="mt-1 text-[11px] text-kal-text-secondary">
                Used {voiceSecondsCharged}s of your voice time for this capture.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-2 text-kal-muted transition-colors hover:bg-kal-card-muted disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-kal-muted">
            Doubt (editable)
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={4}
              className="mt-2 w-full resize-y rounded-xl border border-kal-border bg-kal-input-bg px-3 py-3 text-base leading-relaxed text-kal-text outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40"
            />
          </label>

          <DoubtSubjectSelect
            id={`${baseId}-subject`}
            className="mt-4"
            value={subject}
            onChange={(next) => {
              setSubject(next);
              setTopic("");
            }}
            options={syllabusSubjects}
            disabled={saving}
          />

          <DoubtTopicSelect
            id={`${baseId}-topic`}
            className="mt-4"
            value={topic}
            onChange={setTopic}
            options={topicOptions}
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
              onClick={() => {
                setShowPhotoPrivacy(true);
                fileInputRef.current?.click();
              }}
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
