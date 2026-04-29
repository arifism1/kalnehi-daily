"use client";

import clsx from "clsx";
import { Loader2, Mic, MicOff, X } from "lucide-react";
import { useCallback, useId, useMemo, useState, useTransition } from "react";

import { createMistakeLog, type MistakeType, type MistakeSource } from "@/actions/mistakeLogs";
import { MistakeTypeGrid } from "@/components/mistake-log/MistakeTypeButton";
import { VoiceListeningHint } from "@/components/voice/VoiceListeningHint";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { useCapacitorSpeech } from "@/hooks/useCapacitorSpeech";
import { useMediaRecorderVoice } from "@/hooks/useMediaRecorderVoice";
import { useVoiceSttRouting } from "@/hooks/useVoiceSttRouting";
import {
  VOICE_LONG_FORM_MAX_SESSION_MS,
  VOICE_LONG_FORM_SILENCE_MS,
} from "@/lib/voiceConstants";
import type { ExamScope } from "@/hooks/useAllExamScopes";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Flat list of (optionally labeled) subjects for the dropdown. */
  syllabusSubjects: string[];
  /** Full exam scopes for multi-exam exam picker. */
  examScopes?: ExamScope[];
};

/** Unique sorted subjects from a scope's rows. */
function subjectsFromScope(scope: ExamScope): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of scope.rows) {
    const s = r.subject?.trim();
    if (s && !seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function AddMistakeSheet({ open, onClose, onSaved, syllabusSubjects, examScopes }: Props) {
  const baseId = useId();
  const isMultiExam = (examScopes?.length ?? 0) > 1;
  const [selectedExamLabel, setSelectedExamLabel] = useState<string>("__all__");

  const activeSubjects = useMemo(() => {
    if (!isMultiExam || selectedExamLabel === "__all__" || !examScopes) return syllabusSubjects;
    const scope = examScopes.find((s) => s.examLabel === selectedExamLabel);
    return scope ? subjectsFromScope(scope) : syllabusSubjects;
  }, [isMultiExam, selectedExamLabel, examScopes, syllabusSubjects]);

  const [subject, setSubject] = useState("");
  const [topicLabel, setTopicLabel] = useState("");
  const [mistakeType, setMistakeType] = useState<MistakeType | null>(null);
  const [source, setSource] = useState<MistakeSource | "">("");
  const [note, setNote] = useState("");
  const [flagForRevision, setFlagForRevision] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [voicePreview, setVoicePreview] = useState("");
  const routing = useVoiceSttRouting();

  const handleVoiceTranscript = useCallback(({ transcript }: { transcript: string; occurredAt: string; durationSeconds: number }) => {
    setNote((prev) => (prev ? `${prev} ${transcript}` : transcript));
    setVoicePreview("");
  }, []);

  const { isListening, isSupported: webSpeechSupported, startListening, stopListening, error: voiceError, clearError } =
    useDeviceSpeechRecognition({
      lang: "en-IN",
      maxSessionMs: VOICE_LONG_FORM_MAX_SESSION_MS,
      silenceMs: VOICE_LONG_FORM_SILENCE_MS,
      interimPreview: true,
      onPreviewTranscript: setVoicePreview,
      onTranscript: handleVoiceTranscript,
    });

  const {
    clearError: clearCapError,
    error: capError,
    isRecording: isCapRecording,
    isTranscribing: isCapTranscribing,
    startRecording: startCapRecording,
    stopRecording: stopCapRecording,
  } = useCapacitorSpeech({
    variant: "longForm",
    onTranscript: handleVoiceTranscript,
    onPartialTranscript: setVoicePreview,
    maxMs: VOICE_LONG_FORM_MAX_SESSION_MS,
  });

  const {
    clearError: clearWhisperError,
    error: whisperError,
    isRecording: isWhisperRecording,
    isTranscribing: isWhisperTranscribing,
    startRecording: startWhisperRecording,
    stopRecording: stopWhisperRecording,
    isSupported: whisperMicSupported,
  } = useMediaRecorderVoice({
    maxMs: VOICE_LONG_FORM_MAX_SESSION_MS,
    onTranscript: handleVoiceTranscript,
  });

  const isSupported = routing.useNativeCapacitorStt
    ? true
    : routing.useBrowserWhisperStt
      ? whisperMicSupported
      : webSpeechSupported;

  const isVoiceActive =
    routing.useNativeCapacitorStt
      ? isCapRecording || isCapTranscribing
      : routing.useBrowserWhisperStt
        ? isWhisperRecording || isWhisperTranscribing
        : isListening;

  const voiceMicError = routing.useNativeCapacitorStt
    ? capError
    : routing.useBrowserWhisperStt
      ? whisperError
      : voiceError;

  const startVoice = useCallback(() => {
    if (routing.useNativeCapacitorStt) {
      clearCapError();
      setVoicePreview("");
      void startCapRecording();
    } else if (routing.useBrowserWhisperStt) {
      clearWhisperError();
      setVoicePreview("");
      void startWhisperRecording();
    } else {
      clearError();
      void startListening();
    }
  }, [
    routing.useNativeCapacitorStt,
    routing.useBrowserWhisperStt,
    startCapRecording,
    startWhisperRecording,
    startListening,
    clearCapError,
    clearWhisperError,
    clearError,
  ]);

  const stopVoice = useCallback(() => {
    if (routing.useNativeCapacitorStt) stopCapRecording();
    else if (routing.useBrowserWhisperStt) stopWhisperRecording();
    else stopListening();
  }, [routing.useNativeCapacitorStt, routing.useBrowserWhisperStt, stopCapRecording, stopWhisperRecording, stopListening]);

  const reset = useCallback(() => {
    setSubject("");
    setTopicLabel("");
    setMistakeType(null);
    setSource("");
    setNote("");
    setFlagForRevision(false);
    setSaveError(null);
    setVoicePreview("");
    setSelectedExamLabel("__all__");
    clearError();
    clearCapError();
    clearWhisperError();
  }, [clearError, clearCapError, clearWhisperError]);

  const handleClose = useCallback(() => {
    stopVoice();
    reset();
    onClose();
  }, [reset, onClose, stopVoice]);

  const handleSave = useCallback(() => {
    if (!subject) { setSaveError("Please select a subject."); return; }
    if (!mistakeType) { setSaveError("Please select a mistake type."); return; }

    setSaveError(null);
    startTransition(async () => {
      const result = await createMistakeLog({
        subject,
        topicLabel: topicLabel.trim() || null,
        mistakeType,
        source: (source as MistakeSource) || null,
        note: note.trim() || null,
        flagForRevision,
      });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      reset();
      onSaved();
      onClose();
    });
  }, [subject, topicLabel, mistakeType, source, note, flagForRevision, reset, onSaved, onClose]);

  if (!open) return null;

  const fieldLabel =
    "text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200";
  const fieldInput =
    "w-full rounded-xl border border-zinc-300/95 dark:border-zinc-600 bg-[var(--kal-input-bg)] px-3 py-2.5 text-sm text-zinc-950 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-kal-accent/50 focus:border-kal-accent/50";
  const fieldSelect = clsx(fieldInput, "cursor-pointer");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-kal-overlay backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="relative z-10 flex min-h-0 w-full max-w-lg max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border border-zinc-200/95 bg-kal-bg-elevated shadow-2xl ring-1 ring-zinc-950/10 dark:border-zinc-600 sm:rounded-2xl dark:ring-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-dialog-title`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/90 p-4 dark:border-zinc-600/80">
          <h2
            id={`${baseId}-dialog-title`}
            className="font-semibold text-zinc-950 dark:text-zinc-50"
          >
            Log a Mistake
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-200/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain p-4 pb-2 [-webkit-overflow-scrolling:touch]">
          {/* Exam picker — multi-exam users only */}
          {isMultiExam && examScopes && (
            <div className="space-y-1.5">
              <p className={fieldLabel}>Exam (optional)</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedExamLabel("__all__"); setSubject(""); }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedExamLabel === "__all__"
                      ? "border-kal-accent bg-kal-accent text-white"
                      : "border-zinc-300 bg-zinc-100/90 text-zinc-900 hover:bg-zinc-200/80 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-100"
                  }`}
                >
                  All exams
                </button>
                {examScopes.map((scope) => (
                  <button
                    key={scope.examLabel}
                    type="button"
                    onClick={() => { setSelectedExamLabel(scope.examLabel); setSubject(""); }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      selectedExamLabel === scope.examLabel
                        ? "border-kal-accent bg-kal-accent text-white"
                        : "border-zinc-300 bg-zinc-100/90 text-zinc-900 hover:bg-zinc-200/80 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-100"
                    }`}
                  >
                    {scope.displayName || scope.examLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <label htmlFor={`${baseId}-subject`} className={fieldLabel}>
              Subject *
            </label>
            <select
              id={`${baseId}-subject`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={fieldSelect}
            >
              <option value="">Select subject…</option>
              {activeSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <label htmlFor={`${baseId}-topic`} className={fieldLabel}>
              Topic / Chapter
            </label>
            <input
              id={`${baseId}-topic`}
              type="text"
              value={topicLabel}
              onChange={(e) => setTopicLabel(e.target.value)}
              placeholder="e.g. Newton's 3rd Law, Organic Reactions…"
              className={clsx(
                fieldInput,
                "placeholder:text-zinc-500 dark:placeholder:text-zinc-400",
              )}
            />
          </div>

          {/* Mistake Type */}
          <div className="space-y-1.5">
            <p className={fieldLabel}>Mistake Type *</p>
            <MistakeTypeGrid value={mistakeType} onChange={setMistakeType} disabled={isPending} />
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <label htmlFor={`${baseId}-source`} className={fieldLabel}>
              Source
            </label>
            <select
              id={`${baseId}-source`}
              value={source}
              onChange={(e) => setSource(e.target.value as MistakeSource | "")}
              className={fieldSelect}
            >
              <option value="">— none —</option>
              <option value="mock_test">Mock Test</option>
              <option value="practice">Practice</option>
              <option value="class">Class</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label htmlFor={`${baseId}-note`} className={fieldLabel}>
              Note
            </label>
            <div className="relative">
              <textarea
                id={`${baseId}-note`}
                rows={3}
                value={isVoiceActive && voicePreview ? voicePreview : note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional context, what you'll do differently…"
                className={clsx(
                  fieldInput,
                  "min-h-0 resize-none pr-10 placeholder:text-zinc-500 dark:placeholder:text-zinc-400",
                )}
              />
              {isSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (isVoiceActive) stopVoice();
                    else startVoice();
                  }}
                  className={clsx(
                    "absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border border-transparent transition-colors",
                    isVoiceActive
                      ? "border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
                      : "bg-zinc-200/90 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-300/90 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-700",
                  )}
                >
                  {isVoiceActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
            {isVoiceActive && (
              <>
                <p className="animate-pulse text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {isWhisperTranscribing ? "Transcribing…" : "Listening…"}
                </p>
                {!isWhisperTranscribing && <VoiceListeningHint visible className="!text-left" variant="dictation" />}
              </>
            )}
            {voiceMicError && (
              <p className="text-xs font-medium text-red-700 dark:text-red-300">{voiceMicError}</p>
            )}
          </div>

          {/* Flag for revision */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={flagForRevision}
              onChange={(e) => setFlagForRevision(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-400 accent-kal-accent focus:ring-2 focus:ring-kal-accent/40 dark:border-zinc-500"
            />
            <span className="text-sm text-zinc-900 dark:text-zinc-100">Flag for revision</span>
          </label>
        </div>

        <div className="shrink-0 border-t border-zinc-200/90 bg-kal-bg-elevated p-4 pt-3 dark:border-zinc-600/80 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {saveError && (
            <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-300">{saveError}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border border-zinc-300/95 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200/60 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-kal-accent py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-kal-accent/90 disabled:opacity-60"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Mistake
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
