"use client";

import clsx from "clsx";
import { CheckCircle2, Loader2, Mic, MicOff, PenLine, SkipForward, Target } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { VoiceListeningHint } from "@/components/voice/VoiceListeningHint";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { VOICE_MAX_SESSION_MS, VOICE_SILENCE_AUTO_STOP_MS } from "@/lib/voiceConstants";
import {
  getTodayReflection,
  getRecentReflections,
  upsertDailyReflection,
  type DailyReflectionRow,
} from "@/actions/dailyReflections";

type Field = "finished_today" | "skipped_today" | "tomorrow_priority";

const QUESTIONS: {
  field: Field;
  icon: React.ComponentType<{ className?: string }>;
  question: string;
  placeholder: string;
  accentClass: string;
  borderClass: string;
}[] = [
  {
    field: "finished_today",
    icon: CheckCircle2,
    question: "What's the one thing you actually finished today?",
    placeholder: "e.g. Completed Acid–Base Reactions chapter, solved 40 MCQs…",
    accentClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800/50",
  },
  {
    field: "skipped_today",
    icon: SkipForward,
    question: "What did you skip or avoid?",
    placeholder: "e.g. Skipped Organic Chemistry revision, avoided mock test analysis…",
    accentClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800/50",
  },
  {
    field: "tomorrow_priority",
    icon: Target,
    question: "What is tomorrow's single most important task?",
    placeholder: "e.g. Finish all Thermodynamics exercises…",
    accentClass: "text-violet-600 dark:text-violet-400",
    borderClass: "border-violet-200 dark:border-violet-800/50",
  },
];

type DraftState = Record<Field, string>;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function DailyReflectionClient() {
  const today = useCalendarDate();

  const [draft, setDraft] = useState<DraftState>({
    finished_today: "",
    skipped_today: "",
    tomorrow_priority: "",
  });
  const [savedToday, setSavedToday] = useState<DailyReflectionRow | null>(null);
  const [recentHistory, setRecentHistory] = useState<DailyReflectionRow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeVoiceField, setActiveVoiceField] = useState<Field | null>(null);
  const [voicePreview, setVoicePreview] = useState("");

  // Load today's reflection + recent history
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [todayResult, historyResult] = await Promise.all([
        getTodayReflection(today),
        getRecentReflections(8),
      ]);
      if (cancelled) return;
      if (todayResult.ok && todayResult.data) {
        setSavedToday(todayResult.data);
        setDraft({
          finished_today: todayResult.data.finished_today ?? "",
          skipped_today: todayResult.data.skipped_today ?? "",
          tomorrow_priority: todayResult.data.tomorrow_priority ?? "",
        });
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
      if (historyResult.ok) {
        setRecentHistory(
          historyResult.data
            .filter((r) => r.reflection_date !== today)
            .sort((a, b) => b.reflection_date.localeCompare(a.reflection_date)),
        );
      }
      setLoadingInit(false);
    }
    setLoadingInit(true);
    load();
    return () => { cancelled = true; };
  }, [today]);

  const voiceRef = useRef<Field | null>(null);
  voiceRef.current = activeVoiceField;

  const { isListening, isSupported, startListening, stopListening, error: voiceError, clearError: clearVoiceError } =
    useDeviceSpeechRecognition({
      lang: "en-IN",
      maxSessionMs: VOICE_MAX_SESSION_MS,
      silenceMs: VOICE_SILENCE_AUTO_STOP_MS,
      interimPreview: true,
      onPreviewTranscript: setVoicePreview,
      onTranscript: ({ transcript }) => {
        const field = voiceRef.current;
        if (!field) return;
        setDraft((prev) => ({
          ...prev,
          [field]: prev[field] ? `${prev[field]} ${transcript}` : transcript,
        }));
        setVoicePreview("");
        setActiveVoiceField(null);
      },
    });

  const toggleVoice = useCallback(
    (field: Field) => {
      if (isListening) {
        stopListening();
        setActiveVoiceField(null);
        setVoicePreview("");
      } else {
        clearVoiceError();
        setActiveVoiceField(field);
        startListening();
      }
    },
    [isListening, startListening, stopListening, clearVoiceError],
  );

  const handleSave = useCallback(() => {
    setSaveError(null);
    startTransition(async () => {
      const result = await upsertDailyReflection({
        reflectionDate: today,
        finishedToday: draft.finished_today.trim() || undefined,
        skippedToday: draft.skipped_today.trim() || undefined,
        tomorrowPriority: draft.tomorrow_priority.trim() || undefined,
      });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      setSavedToday(result.data);
      setIsEditing(false);
      // Refresh history
      const histResult = await getRecentReflections(8);
      if (histResult.ok) {
        setRecentHistory(
          histResult.data
            .filter((r) => r.reflection_date !== today)
            .sort((a, b) => b.reflection_date.localeCompare(a.reflection_date)),
        );
      }
    });
  }, [draft, today]);

  if (loadingInit) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-kal-accent/60" />
      </div>
    );
  }

  const showForm = isEditing || !savedToday;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="kal-hero-heading">Daily Debrief</h1>
            <p className="text-sm text-kal-text-secondary">
              {formatDate(today)} · 60-second end-of-day check-in
            </p>
          </div>
          {savedToday && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-kal-text-secondary hover:bg-kal-surface/60 hover:text-kal-text transition-colors"
            >
              <PenLine className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>
      </header>

      {/* Form / read-only view */}
      {showForm ? (
        <div className="space-y-4">
          {QUESTIONS.map(({ field, icon: Icon, question, placeholder, accentClass, borderClass }) => {
            const isActive = activeVoiceField === field;
            const currentPreview = isActive && voicePreview ? voicePreview : "";

            return (
              <div
                key={field}
                className={clsx(
                  "kal-glass-card rounded-2xl border p-4 space-y-3",
                  borderClass,
                )}
              >
                <label className={clsx("flex items-center gap-2 font-semibold text-sm", accentClass)}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {question}
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={isActive && currentPreview ? currentPreview : draft[field]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full resize-none rounded-xl border border-kal-border bg-kal-surface/60 px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-kal-accent/40"
                  />
                  {isSupported && (
                    <button
                      type="button"
                      onClick={() => toggleVoice(field)}
                      aria-label={isActive && isListening ? "Stop voice input" : "Start voice input"}
                      className={clsx(
                        "absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                        isActive && isListening
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-kal-surface text-kal-text-secondary hover:text-kal-accent",
                      )}
                    >
                      {isActive && isListening ? (
                        <MicOff className="h-3.5 w-3.5" />
                      ) : (
                        <Mic className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
                {isActive && isListening && (
                  <div className="space-y-1">
                    <p className="text-xs text-kal-text-secondary animate-pulse">Listening…</p>
                    <VoiceListeningHint visible variant="dictation" className="!text-left" />
                  </div>
                )}
              </div>
            );
          })}

          {(voiceError) && (
            <p className="text-sm text-red-500">{voiceError}</p>
          )}
          {saveError && (
            <p className="text-sm text-red-500">{saveError}</p>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedToday && isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setDraft({
                    finished_today: savedToday.finished_today ?? "",
                    skipped_today: savedToday.skipped_today ?? "",
                    tomorrow_priority: savedToday.tomorrow_priority ?? "",
                  });
                }}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-kal-text-secondary hover:bg-kal-surface/60 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-kal-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-kal-accent/90 disabled:opacity-60 transition-colors"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save reflection
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {QUESTIONS.map(({ field, icon: Icon, question, accentClass, borderClass }) => {
            const value = savedToday?.[field];
            return (
              <div
                key={field}
                className={clsx("kal-glass-card rounded-2xl border p-4 space-y-1.5", borderClass)}
              >
                <p className={clsx("flex items-center gap-2 text-xs font-semibold uppercase tracking-wide", accentClass)}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {question}
                </p>
                <p className="text-sm text-kal-text leading-relaxed">
                  {value || <span className="text-kal-text-secondary/60 italic">Not answered</span>}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* 7-day history */}
      {recentHistory.length > 0 && (
        <section className="space-y-3">
          <h2 className="kal-section-heading text-sm">Recent reflections</h2>
          <ul className="space-y-2">
            {recentHistory.map((r) => (
              <li key={r.id} className="kal-glass-subtle rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-kal-text-secondary">{formatDate(r.reflection_date)}</p>
                <div className="grid gap-1">
                  {r.finished_today && (
                    <p className="text-sm text-kal-text">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Finished: </span>
                      {r.finished_today}
                    </p>
                  )}
                  {r.skipped_today && (
                    <p className="text-sm text-kal-text">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">Skipped: </span>
                      {r.skipped_today}
                    </p>
                  )}
                  {r.tomorrow_priority && (
                    <p className="text-sm text-kal-text">
                      <span className="text-violet-600 dark:text-violet-400 font-medium">Planned: </span>
                      {r.tomorrow_priority}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
