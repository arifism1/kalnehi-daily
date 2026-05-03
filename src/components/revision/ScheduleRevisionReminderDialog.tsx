"use client";

import clsx from "clsx";
import { addDays, format, parseISO } from "date-fns";
import { Loader2, Mic, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { VoiceMinuteLimitLink } from "@/components/subscription/LimitExceededLinks";
import { VoiceListeningHint } from "@/components/voice/VoiceListeningHint";
import { useAiGate } from "@/hooks/useAiGate";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { useCapacitorSpeech } from "@/hooks/useCapacitorSpeech";
import { useMediaRecorderVoice } from "@/hooks/useMediaRecorderVoice";
import { useVoiceSttRouting } from "@/hooks/useVoiceSttRouting";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import type { RevisionDifficulty } from "@/lib/engine/revisionSchedule";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import { plannerTextAppendRevisionReminder } from "@/lib/userPlannerTextClient";
import type { UserPlannerTextBundle } from "@/lib/userPlannerTextTypes";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";
import { VOICE_LONG_FORM_MAX_SESSION_MS, VOICE_LONG_FORM_SILENCE_MS } from "@/lib/voiceConstants";
import { normalizeSpeechTranscript } from "@/lib/voiceTranscriptNormalize";

const TOPIC_MATCH_CAP = 40;

const SPEECH_LANGS: { value: string; label: string }[] = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "en-US", label: "English (US) fallback" },
];

function rowLabel(r: MergedSyllabusRow): string {
  return (r.microtopic ?? "").trim() || (r.chapter ?? "").trim() || "Topic";
}

function formatRowForDisplay(r: MergedSyllabusRow): string {
  return `${rowLabel(r)} · ${(r.subject ?? "").trim() || "Subject"}`;
}

export type ScheduleRevisionInitialSnapshot = {
  title: string;
  /** Voice / deep-link: next due date as YYYY-MM-DD (IST calendar sense from caller) */
  nextDue?: string | null;
  /** Optional notes pre-fill (e.g. empty for new; daily task can leave empty) */
  notes?: string;
  /** Syllabus id from a daily task — saved even on custom topic tab */
  microtopicId?: string | null;
  /** If microtopic is set, open on syllabus tab with that selection */
  sourceTab?: "custom" | "syllabus";
};

const EMPTY_INITIAL: ScheduleRevisionInitialSnapshot = {
  title: "",
  notes: "",
  microtopicId: null,
  sourceTab: "custom",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  /** Show voice-to-fields; Revision Tracker only. */
  showVoice: boolean;
  dialogTitle: string;
  /** ARIA id for the heading (stable) */
  titleId?: string;
  /** Reset when opening; use stable subfields in parent or microtopicId+title to detect new task. */
  initial?: ScheduleRevisionInitialSnapshot;
  saveButtonLabel?: string;
  onSaved?: (bundle: UserPlannerTextBundle) => void;
};

export function ScheduleRevisionReminderDialog({
  open,
  onOpenChange,
  userId,
  showVoice,
  dialogTitle,
  titleId = "schedule-revision-reminder-dialog-title",
  initial,
  saveButtonLabel = "Save",
  onSaved,
}: Props) {
  const init = initial ?? EMPTY_INITIAL;
  const today = useCalendarDate();
  const { examLabel, loading: examLoading } = usePrimaryExamLabel();
  const {
    rows,
    cuetAwaitingDomainSelection,
    loading: syllabusLoading,
    error: syllabusError,
  } = useSyllabusTracker();

  const syllabusSoon = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading: examLoading,
    syllabusLoading,
    syllabusError,
    syllabusRowCount: rows.length,
    cuetAwaitingDomainSelection,
  });

  const [sourceTab, setSourceTab] = useState<"custom" | "syllabus">("custom");
  const [titleInput, setTitleInput] = useState("");
  const [nextDue, setNextDue] = useState(() =>
    format(addDays(parseISO(today), 7), "yyyy-MM-dd"),
  );
  const [difficulty, setDifficulty] = useState<RevisionDifficulty>("medium");
  const [notesInput, setNotesInput] = useState("");
  const [syllabusQuery, setSyllabusQuery] = useState("");
  const [syllabusPickerOpen, setSyllabusPickerOpen] = useState(false);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string | null>(
    null,
  );
  const [carriedMicrotopicId, setCarriedMicrotopicId] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [speechLang, setSpeechLang] = useState("en-IN");
  const [speechApiBusy, setSpeechApiBusy] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechQuotaExceeded, setSpeechQuotaExceeded] = useState(false);
  const [speechQuotaNote, setSpeechQuotaNote] = useState<string | null>(null);
  const [speechStructHint, setSpeechStructHint] = useState<string | null>(null);
  /** Live native-STT partials (Capacitor shell only). */
  const [speechDraftLive, setSpeechDraftLive] = useState("");

  const routing = useVoiceSttRouting();

  const { hasAiAccess, canDoVoiceSession } = useAiGate();

  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const rowById = useMemo(() => {
    const m = new Map<string, MergedSyllabusRow>();
    for (const r of rows) {
      m.set(normalizeSyllabusMasterId(String(r.id)), r);
    }
    return m;
  }, [rows]);

  const filteredSyllabusRows = useMemo(() => {
    const q = syllabusQuery.trim().toLowerCase();
    if (!q) return rows.slice(0, TOPIC_MATCH_CAP);
    const out: MergedSyllabusRow[] = [];
    for (const r of rows) {
      const hay = `${rowLabel(r)} ${(r.chapter ?? "").trim()} ${(r.subject ?? "").trim()}`
        .toLowerCase();
      if (hay.includes(q)) {
        out.push(r);
        if (out.length >= TOPIC_MATCH_CAP) break;
      }
    }
    return out;
  }, [rows, syllabusQuery]);

  const sendRevisionTranscript = useCallback(
    async (transcript: string, occurredAt: string, durationSeconds: number) => {
      const cleaned = normalizeSpeechTranscript(transcript);
      if (!cleaned) {
        setSpeechError("No speech captured. Try again.");
        return;
      }
      if (!userId) return;
      setSpeechApiBusy(true);
      setSpeechError(null);
      setSpeechQuotaExceeded(false);
      setSpeechQuotaNote(null);
      setSpeechStructHint(null);
      try {
        const parseRes = await fetch("/api/voice-parse-revision-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            transcript: cleaned,
            today,
            occurred_at: occurredAt,
            durationSeconds,
          }),
        });
        const res = (await parseRes.json()) as
          | {
              ok: true;
              reminder: {
                title: string;
                next_due: string;
                difficulty: RevisionDifficulty;
                notes: string;
              };
              voice_seconds_charged?: number;
            }
          | { ok: false; error: string; openRawFallback?: boolean };

        if (!res.ok) {
          if (parseRes.status === 401) {
            setSpeechError("Please sign in to use voice dictation.");
            return;
          }
          if (parseRes.status === 429) {
            setSpeechQuotaExceeded(true);
            setSpeechError(
              surfaceErrorForUi(
                typeof res.error === "string" ? res.error : "Voice quota exceeded.",
              ),
            );
            return;
          }
          if (res.openRawFallback) {
            setTitleInput(cleaned.slice(0, 500));
            setSourceTab("custom");
            setSelectedSyllabusId(null);
            setCarriedMicrotopicId(null);
            setSpeechStructHint(
              "Could not auto-fill all fields. Edit the title and date below, then save.",
            );
            return;
          }
          setSpeechError(surfaceErrorForUi(String(res.error ?? "Parse failed.")));
          return;
        }
        setTitleInput(res.reminder.title);
        setNextDue(res.reminder.next_due);
        setDifficulty(res.reminder.difficulty);
        setNotesInput(res.reminder.notes);
        setSourceTab("custom");
        setSelectedSyllabusId(null);
        setCarriedMicrotopicId(null);
        setSyllabusQuery("");
        setSyllabusPickerOpen(false);
        if (typeof res.voice_seconds_charged === "number") {
          setSpeechQuotaNote(
            `Used ${res.voice_seconds_charged}s of your voice time for this parse.`,
          );
        }
      } catch {
        setTitleInput(cleaned.slice(0, 500));
        setSourceTab("custom");
        setSelectedSyllabusId(null);
        setCarriedMicrotopicId(null);
        setSpeechStructHint(
          "Could not reach the server. The topic was added as text — set the due date, then save.",
        );
      } finally {
        setSpeechApiBusy(false);
      }
    },
    [userId, today],
  );

  const {
    clearError: clearSpeechRecognitionError,
    error: speechRecognitionError,
    isListening,
    isSupported: webSpeechSupported,
    startListening,
    stopListening,
  } = useDeviceSpeechRecognition({
    lang: speechLang,
    maxSessionMs: VOICE_LONG_FORM_MAX_SESSION_MS,
    silenceMs: VOICE_LONG_FORM_SILENCE_MS,
    onStart: () => {
      setSpeechError(null);
      setSpeechStructHint(null);
    },
    onTranscript: ({ transcript, occurredAt, durationSeconds }) => {
      void sendRevisionTranscript(transcript, occurredAt, durationSeconds);
    },
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
    onTranscript: ({ transcript, occurredAt, durationSeconds }) => {
      setSpeechDraftLive("");
      void sendRevisionTranscript(transcript, occurredAt, durationSeconds);
    },
    onPartialTranscript: setSpeechDraftLive,
    maxMs: VOICE_LONG_FORM_MAX_SESSION_MS,
    lang: speechLang,
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
    onTranscript: ({ transcript, occurredAt, durationSeconds }) => {
      void sendRevisionTranscript(transcript, occurredAt, durationSeconds);
    },
  });

  const isSupported = routing.useNativeCapacitorStt
    ? true
    : routing.useBrowserWhisperStt
      ? whisperMicSupported
      : webSpeechSupported;

  const isVoiceListening = routing.useNativeCapacitorStt
    ? isCapRecording
    : routing.useBrowserWhisperStt
      ? isWhisperRecording
      : isListening;

  const isVoiceProcessing = routing.useNativeCapacitorStt
    ? isCapTranscribing
    : routing.useBrowserWhisperStt
      ? isWhisperTranscribing
      : false;

  const startVoice = useCallback(() => {
    if (routing.useNativeCapacitorStt) {
      clearCapError();
      setSpeechDraftLive("");
      void startCapRecording();
    } else if (routing.useBrowserWhisperStt) {
      clearWhisperError();
      setSpeechDraftLive("");
      void startWhisperRecording();
    } else void startListening();
  }, [
    routing.useNativeCapacitorStt,
    routing.useBrowserWhisperStt,
    startCapRecording,
    startWhisperRecording,
    startListening,
    clearCapError,
    clearWhisperError,
  ]);

  const stopVoice = useCallback(() => {
    if (routing.useNativeCapacitorStt) stopCapRecording();
    else if (routing.useBrowserWhisperStt) stopWhisperRecording();
    else void stopListening();
  }, [
    routing.useNativeCapacitorStt,
    routing.useBrowserWhisperStt,
    stopCapRecording,
    stopWhisperRecording,
    stopListening,
  ]);

  const voicePhase: "idle" | "listening" | "processing" = (speechApiBusy || isVoiceProcessing)
    ? "processing"
    : isVoiceListening
      ? "listening"
      : "idle";

  const displaySpeechError =
    (routing.useNativeCapacitorStt
      ? capError
      : routing.useBrowserWhisperStt
        ? whisperError
        : speechRecognitionError) ?? speechError;

  useEffect(() => {
    if (!open) {
      stopVoice();
    }
  }, [open, stopVoice]);

  // Reset form when dialog opens
  const initialTitle = (init.title ?? "").trim();
  const initialMicro = init.microtopicId?.trim() || null;
  const initialSource = init.sourceTab ?? (initialMicro ? "syllabus" : "custom");
  const initialNotes = (init.notes ?? "").trim();
  const initialNextDue = (init.nextDue ?? "").trim();

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setSourceTab(initialSource);
    setTitleInput(initialTitle);
    const fallbackDue = format(addDays(parseISO(today), 7), "yyyy-MM-dd");
    setNextDue(/^\d{4}-\d{2}-\d{2}$/.test(initialNextDue) ? initialNextDue : fallbackDue);
    setDifficulty("medium");
    setNotesInput(initialNotes);
    setSyllabusQuery("");
    setSyllabusPickerOpen(false);
    setCarriedMicrotopicId(initialMicro);
    setSelectedSyllabusId(initialMicro);
    if (showVoice) {
      setSpeechError(null);
      setSpeechQuotaExceeded(false);
      setSpeechQuotaNote(null);
      setSpeechStructHint(null);
      setSpeechDraftLive("");
      setSpeechApiBusy(false);
      clearSpeechRecognitionError();
      clearCapError();
      clearWhisperError();
    }
  }, [
    open,
    today,
    initialTitle,
    initialMicro,
    initialSource,
    initialNotes,
    initialNextDue,
    showVoice,
    clearSpeechRecognitionError,
    clearCapError,
    clearWhisperError,
  ]);

  useEffect(() => {
    if (!open || sourceTab !== "syllabus") return;
    const id = selectedSyllabusId;
    if (!id) return;
    const r = rowById.get(normalizeSyllabusMasterId(id));
    if (r) setTitleInput(formatRowForDisplay(r));
  }, [open, sourceTab, selectedSyllabusId, rowById]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSyllabusPickerOpen(false);
      }
    };
    if (!open) return;
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open]);

  const setDueInDays = (days: number) => {
    setNextDue(format(addDays(parseISO(today), days), "yyyy-MM-dd"));
  };

  const onSubmit = async () => {
    if (!userId) return;
    const title = titleInput.trim();
    if (!title) {
      setFormError("Add a topic name.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue.trim())) {
      setFormError("Pick a valid due date.");
      return;
    }
    setSaving(true);
    setFormError(null);
    let microtopicId: string | undefined;
    if (sourceTab === "syllabus" && selectedSyllabusId) {
      microtopicId = normalizeSyllabusMasterId(selectedSyllabusId);
    } else if (sourceTab === "custom" && carriedMicrotopicId) {
      microtopicId = normalizeSyllabusMasterId(carriedMicrotopicId);
    }
    try {
      const bundle = await plannerTextAppendRevisionReminder(userId, {
        title,
        difficulty,
        nextDue: nextDue.trim(),
        microtopicId,
        notes: notesInput.trim() || undefined,
      });
      onSaved?.(bundle);
      onOpenChange(false);
    } catch {
      setFormError("Could not save. Try again when online.");
    } finally {
      setSaving(false);
    }
  };

  const pickSyllabusRow = (r: MergedSyllabusRow) => {
    const id = normalizeSyllabusMasterId(String(r.id));
    setSelectedSyllabusId(id);
    setCarriedMicrotopicId(id);
    setTitleInput(formatRowForDisplay(r));
    setSyllabusPickerOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom,0px))] [padding-top:max(1rem,env(safe-area-inset-top,0px))]"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 bg-kal-overlay backdrop-blur-sm"
        onClick={() => !saving && onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="kal-glass-panel relative z-[81] my-auto flex min-h-0 w-full max-w-lg max-h-[min(92dvh,100dvh-2rem)] flex-col overflow-hidden rounded-2xl shadow-lg sm:max-h-[min(90dvh,85dvh)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-kal-border/50 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <h2 id={titleId} className="text-lg font-bold text-kal-text">
            {dialogTitle}
          </h2>
          <button
            type="button"
            aria-label="Close"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-5 py-4 sm:px-6 [-webkit-overflow-scrolling:touch]">
        {syllabusSoon && examLabel ? (
          <p className="mb-3 text-xs text-kal-muted">
            Syllabus picker is limited for your exam — you can still add a custom topic
            name below.
          </p>
        ) : null}

        <div className="mb-4 flex rounded-xl border border-kal-border/70 p-0.5">
          <button
            type="button"
            onClick={() => {
              setSourceTab("custom");
              setSelectedSyllabusId(null);
              setSyllabusPickerOpen(false);
            }}
            className={clsx(
              "min-h-[40px] flex-1 rounded-lg px-3 text-xs font-bold transition-colors sm:text-sm",
              sourceTab === "custom"
                ? "bg-kal-accent text-kal-accent-foreground shadow-sm"
                : "text-kal-muted hover:text-kal-text",
            )}
          >
            Custom topic
          </button>
          <button
            type="button"
            onClick={() => setSourceTab("syllabus")}
            className={clsx(
              "min-h-[40px] flex-1 rounded-lg px-3 text-xs font-bold transition-colors sm:text-sm",
              sourceTab === "syllabus"
                ? "bg-kal-accent text-kal-accent-foreground shadow-sm"
                : "text-kal-muted hover:text-kal-text",
            )}
          >
            From syllabus
          </button>
        </div>

        {showVoice && userId ? (
          <div className="mb-4 rounded-xl border border-kal-border/60 bg-kal-card-muted/20 p-3">
            <p className="text-xs font-semibold text-kal-text-secondary">Add by voice</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-kal-muted">
              Uses available voice credits.
            </p>
            {!hasAiAccess || !canDoVoiceSession ? (
              <p className="mt-2 text-xs text-kal-muted">
                Voice allowance needed for speech-to-fields. <VoiceMinuteLimitLink />
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <label className="block min-w-0 flex-1 text-[11px] font-medium text-kal-muted">
                  Speech language
                  <select
                    value={speechLang}
                    onChange={(e) => setSpeechLang(e.target.value)}
                    disabled={voicePhase !== "idle" || saving}
                    className="mt-1 block w-full min-h-[40px] rounded-xl border border-kal-border bg-kal-input-bg px-2.5 text-sm text-kal-text"
                  >
                    {SPEECH_LANGS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      voicePhase === "processing" ||
                      !isSupported ||
                      Boolean(saving) ||
                      !hasAiAccess ||
                      !canDoVoiceSession
                    }
                    onClick={() => {
                      if (voicePhase === "listening") stopVoice();
                      else startVoice();
                    }}
                    className={clsx(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition",
                      voicePhase === "listening" && "animate-pulse",
                      (voicePhase === "processing" || !isSupported) && "opacity-50",
                    )}
                    style={
                      voicePhase === "listening"
                        ? { border: "2px solid #EF9F27", backgroundColor: "#EF9F27" }
                        : { border: "1.5px solid #EF9F27", backgroundColor: "#FFF3E4" }
                    }
                    aria-pressed={voicePhase === "listening"}
                    aria-label={
                      voicePhase === "listening"
                        ? "Stop listening"
                        : "Dictate revision by voice"
                    }
                  >
                    {voicePhase === "processing" ? (
                      <Loader2
                        className="h-5 w-5 animate-spin"
                        style={{ color: "#EF9F27" }}
                        aria-hidden
                      />
                    ) : (
                      <Mic
                        className="h-5 w-5"
                        style={{
                          color: voicePhase === "listening" ? "#ffffff" : "#EF9F27",
                        }}
                        aria-hidden
                      />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p
                      className="text-xs font-medium text-kal-text-secondary"
                      aria-live="polite"
                    >
                      {voicePhase === "listening"
                        ? routing.useBrowserWhisperStt
                          ? "Recording…"
                          : "Listening…"
                        : voicePhase === "processing"
                          ? "Filling form…"
                          : "Tap the mic to dictate"}
                    </p>
                    <VoiceListeningHint
                      visible={voicePhase === "listening"}
                      className="!text-left"
                      variant={
                        routing.useBrowserWhisperStt ? "whisper" : "dictation"
                      }
                    />
                    {voicePhase === "listening" && speechDraftLive ? (
                      <p className="mt-1 max-w-[280px] rounded-md border border-kal-border/40 bg-kal-surface/40 px-2 py-1.5 text-[11px] leading-snug text-kal-text">
                        {speechDraftLive}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
            {speechQuotaNote ? (
              <p className="mt-2 text-[11px] text-kal-text-secondary">{speechQuotaNote}</p>
            ) : null}
            {speechStructHint ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300" role="status">
                {speechStructHint}
              </p>
            ) : null}
            {displaySpeechError ? (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400" role="alert">
                {displaySpeechError}
                {speechQuotaExceeded ? (
                  <>
                    {" "}
                    <VoiceMinuteLimitLink />
                  </>
                ) : null}
              </p>
            ) : null}
            {!isSupported ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                Speech recognition is unavailable in this browser. Use Chrome, Edge, or
                the Kalnehi app.
              </p>
            ) : null}
          </div>
        ) : null}

        {sourceTab === "custom" ? (
          <label className="mb-3 block">
            <span className="text-xs font-medium text-kal-muted">Topic name</span>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="e.g. Rotational Dynamics — friction edge cases"
              className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            />
          </label>
        ) : (
          <div ref={searchWrapRef} className="relative mb-3">
            <label className="block">
              <span className="text-xs font-medium text-kal-muted">Search syllabus</span>
              <input
                type="text"
                value={syllabusQuery}
                onChange={(e) => {
                  setSyllabusQuery(e.target.value);
                  setSyllabusPickerOpen(true);
                }}
                onFocus={() => setSyllabusPickerOpen(true)}
                placeholder="Chapter or microtopic…"
                className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              />
            </label>
            {syllabusPickerOpen && filteredSyllabusRows.length > 0 ? (
              <ul
                className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-kal-border bg-kal-card py-1 shadow-lg"
                role="listbox"
              >
                {filteredSyllabusRows.map((r) => (
                  <li key={String(r.id)} role="none">
                    <button
                      type="button"
                      role="option"
                      className="flex w-full px-3 py-2 text-left text-sm hover:bg-kal-accent-soft/50"
                      onClick={() => pickSyllabusRow(r)}
                    >
                      {formatRowForDisplay(r)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selectedSyllabusId ? (
              <p className="mt-2 text-xs text-kal-muted">
                Linked to syllabus. Topic name below can be edited.
              </p>
            ) : null}
            <label className="mt-3 block">
              <span className="text-xs font-medium text-kal-muted">Topic name</span>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              />
            </label>
          </div>
        )}

        <p className="mb-1.5 text-xs font-medium text-kal-muted">Due date</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {([3, 7, 14] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDueInDays(d)}
              disabled={saving}
              className="min-h-[36px] rounded-lg border border-kal-border/80 bg-kal-card-muted/50 px-2.5 text-xs font-semibold text-kal-text transition hover:border-kal-accent/50 hover:text-kal-accent disabled:opacity-50"
            >
              +{d}d
            </button>
          ))}
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-kal-muted">Or pick a date</span>
            <input
              type="date"
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-kal-muted">
              Priority / difficulty
            </span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as RevisionDifficulty)}
              className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>

        <label className="mb-4 block">
          <span className="text-xs font-medium text-kal-muted">Notes (optional)</span>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            rows={3}
            placeholder="Context, page numbers, mistake patterns…"
            className="mt-1.5 w-full resize-y rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
          />
        </label>
        </div>

        <div className="shrink-0 border-t border-kal-border/50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        {formError ? (
          <p className="mb-3 text-sm font-medium text-rose-600 dark:text-rose-400">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="kal-glass-subtle min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !userId}
            onClick={() => void onSubmit()}
            className="kal-btn-accent min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              saveButtonLabel
            )}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
