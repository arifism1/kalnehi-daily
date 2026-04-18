"use client";

import { addDays, format, parseISO } from "date-fns";
import { Loader2, Mic, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { insertDailyTask } from "@/actions/dailyPlan";
import { saveRawVoiceNote } from "@/actions/voiceDictate";
import {
  DailyPlanPreviewStaging,
  isPreviewRowIncluded,
  type DailyPlanPreviewRow,
} from "@/components/planner/DailyPlanPreviewStaging";
import { UnifiedDailyPlanList } from "@/components/planner/UnifiedDailyPlanList";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { usePlannerDateMidnightRollover } from "@/hooks/usePlannerDateMidnightRollover";
import {
  addToPlanButtonLabel,
  dailyPlanLiveHeading,
  isValidPlanDateString,
} from "@/lib/dailyPlanUiDate";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { slotFromStartEnd } from "@/lib/dailyPlanTime";
import type { VoiceDraftTask } from "@/lib/voiceDraftFromGroq";
import { plannerDurationFromTimeInputs } from "@/lib/voicePlannerSync";
import { useAuthStore } from "@/store/useAuthStore";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";

type Phase = "idle" | "listening" | "processing" | "error";

const LANGS: { value: string; label: string }[] = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "en-US", label: "English (US) fallback" },
];

function normalizeSpeechTranscript(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (out[out.length - 1] === p) continue;
    out.push(p);
  }
  return out.join(" ");
}

function emptyPreviewRow(): DailyPlanPreviewRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    startInput: "",
    endInput: "",
    duration: null,
  };
}

function toPreviewRowsFromParse(
  tasks: VoiceDraftTask[],
  transcriptChunk: string,
): DailyPlanPreviewRow[] {
  const chunk = transcriptChunk.slice(0, 12_000);
  return tasks.map((t) => ({
    id: crypto.randomUUID(),
    name: t.taskTitle?.trim() ?? "",
    startInput: t.start_time ?? "",
    endInput: t.end_time ?? "",
    duration: t.duration ?? null,
    sourceRaw: chunk,
  }));
}

function scrollDictateStaging(): void {
  window.setTimeout(() => {
    document
      .getElementById("dictate-staging")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

function scrollDictateLive(): void {
  window.setTimeout(() => {
    document
      .getElementById("dictate-live-plan")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 200);
}

type DictateMyDayProps = {
  /** Deep link from `/dictate-day?planDate=yyyy-MM-dd` (also accepts legacy `date`). */
  urlInitialPlanDate?: string | null;
};

export function DictateMyDay({ urlInitialPlanDate = null }: DictateMyDayProps) {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const [logDate, setLogDate] = useState(() =>
    urlInitialPlanDate && isValidPlanDateString(urlInitialPlanDate)
      ? urlInitialPlanDate
      : today,
  );
  const addPlanLabel = useMemo(
    () => addToPlanButtonLabel(logDate, today),
    [logDate, today],
  );
  const livePlanTitle = useMemo(
    () => dailyPlanLiveHeading(logDate, today),
    [logDate, today],
  );
  const [lang, setLang] = useState("en-IN");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fallbackPanel, setFallbackPanel] = useState<{
    text: string;
    editMode: boolean;
  } | null>(null);
  const [previewRows, setPreviewRows] = useState<DailyPlanPreviewRow[]>(() => [
    emptyPreviewRow(),
  ]);
  const [planListKey, setPlanListKey] = useState(0);
  const [savePhase, setSavePhase] = useState<"idle" | "save">("idle");
  const [voiceQuotaNote, setVoiceQuotaNote] = useState<string | null>(null);

  const previewRowsRef = useRef(previewRows);
  previewRowsRef.current = previewRows;
  /** Last on-device speech session length (for quota when saving raw note). */
  const lastVoiceDurationSecondsRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setPreviewRows([emptyPreviewRow()]);
    setFallbackPanel(null);
    setError(null);
    setVoiceQuotaNote(null);
  }, [logDate]);

  useEffect(() => {
    if (urlInitialPlanDate && isValidPlanDateString(urlInitialPlanDate)) {
      setLogDate(urlInitialPlanDate);
    }
  }, [urlInitialPlanDate]);

  usePlannerDateMidnightRollover(today, setLogDate);

  const sendTranscript = useCallback(
    async (transcript: string, occurredAt: string, durationSeconds: number) => {
      const cleaned = normalizeSpeechTranscript(transcript);
      if (!cleaned) {
        setError("No speech captured. Try again.");
        return;
      }
      lastVoiceDurationSecondsRef.current = durationSeconds;
      setIsProcessing(true);
      setError(null);
      setVoiceQuotaNote(null);
      try {
        const parseRes = await fetch("/api/voice-parse-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: cleaned,
            log_date: logDate,
            occurred_at: occurredAt,
            durationSeconds,
          }),
        });
        const res = (await parseRes.json()) as
          | { ok: true; tasks: VoiceDraftTask[]; voice_seconds_charged?: number }
          | { ok: false; error: string; openRawFallback?: boolean };

        if (!res.ok) {
          if (parseRes.status === 401) {
            setError("Please sign in to use voice dictation.");
            return;
          }
          if (parseRes.status === 429) {
            setError(
              surfaceErrorForUi(
                typeof res.error === "string" ? res.error : "Voice quota exceeded.",
              ),
            );
            return;
          }
          if (res.openRawFallback) {
            setFallbackPanel({ text: cleaned, editMode: false });
            setError(null);
          } else {
            setError(surfaceErrorForUi(res.error));
          }
          return;
        }
        if (typeof res.voice_seconds_charged === "number") {
          setVoiceQuotaNote(
            `Used ${res.voice_seconds_charged}s of your voice time for this parse.`,
          );
        }
        setFallbackPanel(null);
        const chunk = cleaned;
        const newRows = toPreviewRowsFromParse(res.tasks, chunk);
        setPreviewRows((prev) => {
          const kept = prev.filter(
            (r) => r.name.trim() || r.startInput || r.endInput,
          );
          const merged = [...kept, ...newRows];
          return merged.length > 0 ? merged : [emptyPreviewRow()];
        });
        scrollDictateStaging();
      } catch {
        setFallbackPanel({ text: cleaned, editMode: false });
      } finally {
        setIsProcessing(false);
      }
    },
    [logDate],
  );

  const {
    clearError: clearRecognitionError,
    error: recognitionError,
    isListening,
    isSupported,
    startListening,
    stopListening,
  } = useDeviceSpeechRecognition({
    lang,
    maxSessionMs: null,
    silenceMs: null,
    onStart: () => {
      setError(null);
      setFallbackPanel(null);
    },
    onTranscript: ({ transcript, occurredAt, durationSeconds }) => {
      void sendTranscript(transcript, occurredAt, durationSeconds);
    },
  });

  const activeError = recognitionError ?? error;
  const phase: Phase = isProcessing
    ? "processing"
    : isListening
      ? "listening"
      : activeError
        ? "error"
        : "idle";

  const saveFallbackNote = useCallback(async () => {
    if (!fallbackPanel?.text.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await saveRawVoiceNote({
        transcript: fallbackPanel.text.trim(),
        log_date: logDate,
        occurred_at: new Date().toISOString(),
        durationSeconds: lastVoiceDurationSecondsRef.current,
      });
      if (!res.ok) {
        setError(surfaceErrorForUi(res.error));
        return;
      }
      setFallbackPanel(null);
      window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
      setPlanListKey((k) => k + 1);
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [fallbackPanel, logDate]);

  const addFallbackToPreview = useCallback(() => {
    if (!fallbackPanel?.text.trim()) return;
    const t = fallbackPanel.text.trim();
    setPreviewRows((prev) => {
      const kept = prev.filter(
        (r) => r.name.trim() || r.startInput || r.endInput,
      );
      return [
        ...kept,
        {
          id: crypto.randomUUID(),
          name: t.slice(0, 500),
          startInput: "",
          endInput: "",
          duration: null,
          sourceRaw: t.slice(0, 12_000),
        },
        emptyPreviewRow(),
      ];
    });
    setFallbackPanel(null);
    scrollDictateStaging();
  }, [fallbackPanel]);

  const updatePreviewRow = useCallback(
    (id: string, patch: Partial<DailyPlanPreviewRow>) => {
      setPreviewRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const next = { ...r, ...patch };
          if ("startInput" in patch || "endInput" in patch) {
            next.duration = plannerDurationFromTimeInputs(
              next.startInput,
              next.endInput,
            );
          }
          return next;
        }),
      );
    },
    [],
  );

  const removePreviewRow = useCallback((id: string) => {
    setPreviewRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addPreviewRow = useCallback(() => {
    setPreviewRows((prev) => [...prev, emptyPreviewRow()]);
  }, []);

  const commitPreviewToPlan = useCallback(async () => {
    setError(null);
    const named = previewRowsRef.current.filter(isPreviewRowIncluded);
    if (named.length === 0) {
      setError(
        "Add at least one task in the preview, or turn off Exclude on rows you want to save.",
      );
      return;
    }
    setSavePhase("save");
    try {
      for (const r of named) {
        const { time_slot, time_start, time_end } = slotFromStartEnd(
          r.startInput,
          r.endInput,
        );
        const res = await insertDailyTask({
          plan_date: logDate,
          id: crypto.randomUUID(),
          title: r.name.trim(),
          time_slot,
          time_start,
          time_end,
          source: "voice",
          source_raw_text: r.sourceRaw ?? null,
          syllabus_master_id: r.syllabus_master_id ?? null,
        });
        if (!res.ok) {
          setError(surfaceErrorForUi(res.error));
          return;
        }
      }
      window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
      setPlanListKey((k) => k + 1);
      setPreviewRows([emptyPreviewRow()]);
      scrollDictateLive();
    } catch (e) {
      setError(surfaceErrorForUi(e));
    } finally {
      setSavePhase("idle");
    }
  }, [logDate]);

  const busyCommit = savePhase === "save";
  const previewProcessing =
    phase === "listening" || phase === "processing";

  if (!user) {
    return (
      <p className="rounded-[1rem] border border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] px-4 py-3 text-sm text-[var(--kal-warn-text)]">
        Sign in to save voice logs to your timeline.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Pro · Voice
        </p>
        <h1 className="kal-feature-title mt-1 flex flex-wrap items-center gap-2">
          <Volume2 className="h-7 w-7 shrink-0 text-kal-accent" aria-hidden />
          Dictate My Day
        </h1>
        <p className="kal-glass-subtle mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed text-kal-muted">
          <span className="font-medium text-kal-text-secondary">Tip:</span> Speak
          naturally, then tap Stop when you&apos;re done.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="kal-glass-subtle flex min-h-[44px] items-center gap-1 rounded-xl p-1">
          {[
            { id: today, label: "Today" },
            {
              id: format(addDays(parseISO(today), -1), "yyyy-MM-dd"),
              label: "Yesterday",
            },
            {
              id: format(addDays(parseISO(today), 1), "yyyy-MM-dd"),
              label: "Tomorrow",
            },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setLogDate(d.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                logDate === d.id
                  ? "bg-kal-accent text-white"
                  : "text-kal-muted hover:text-kal-text"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <label className="block text-[11px] font-medium text-kal-muted">
          Plan date
          <input
            type="date"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            className="mt-1 block min-h-[44px] rounded-xl border border-kal-border bg-kal-input-bg px-3 text-sm text-kal-text"
          />
        </label>
        <label className="block text-[11px] font-medium text-kal-muted">
          Speech language
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="mt-1 block min-h-[44px] min-w-[12rem] rounded-xl border border-kal-border bg-kal-input-bg px-3 text-sm text-kal-text"
          >
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="kal-glass-panel rounded-[1.25rem] p-6 sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <button
            type="button"
            disabled={phase === "processing" || !isSupported}
            onClick={() => {
              if (phase === "listening") void stopListening();
              else void startListening();
            }}
            className={[
              "relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[3px] transition-all sm:h-28 sm:w-28",
              phase === "listening"
                ? "border-violet-400 bg-violet-500/30 shadow-[0_0_48px_rgba(139,92,246,0.45)] animate-pulse"
                : "border-violet-500/40 bg-violet-500/15 hover:bg-violet-500/25",
              phase === "processing" || !isSupported ? "opacity-50" : "",
            ].join(" ")}
            aria-pressed={phase === "listening"}
            aria-label={phase === "listening" ? "Stop listening" : "Start listening"}
          >
            {phase === "processing" ? (
              <Loader2 className="h-10 w-10 animate-spin text-violet-200" />
            ) : (
              <Mic
                className={`h-10 w-10 ${
                  phase === "listening" ? "text-violet-100" : "text-violet-200"
                }`}
              />
            )}
          </button>
          <p
            className="text-sm font-semibold tracking-wide text-kal-text-secondary"
            aria-live="polite"
          >
            {phase === "listening"
              ? "Listening..."
              : phase === "processing"
                ? "Processing..."
                : "Tap the mic to dictate"}
          </p>
          {phase === "listening" ? (
            <button
              type="button"
              onClick={() => void stopListening()}
              className="min-h-[44px] rounded-xl border border-white/30 bg-white/50 px-4 py-2 text-sm font-semibold text-kal-text-secondary backdrop-blur-sm hover:bg-white/70 dark:border-white/12 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/70"
            >
              Stop
            </button>
          ) : null}
          {!isSupported ? (
            <p className="max-w-sm text-sm text-[var(--kal-warn-text)]">
              Device speech recognition is unavailable in this browser. Try Chrome or the
              Kalnehi Android app.
            </p>
          ) : null}
        </div>
      </section>

      <section className="kal-glass-panel rounded-[1.25rem] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-kal-text">Preview (not saved yet)</h2>
          <span className="text-xs text-kal-muted">{logDate}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-kal-muted">
          Parsed lines land here first. Edit times or names, then use{" "}
          <span className="font-semibold text-kal-text-secondary">{addPlanLabel}</span> — the
          live list below shows the same date ({logDate}) and stays in sync with Self Type.
        </p>
        {voiceQuotaNote ? (
          <p className="mt-2 rounded-lg border border-kal-accent/25 bg-kal-accent/5 px-3 py-2 text-xs text-kal-text-secondary">
            {voiceQuotaNote}
          </p>
        ) : null}
        <DailyPlanPreviewStaging
          sectionId="dictate-staging"
          title=""
          subtitle=""
          rows={previewRows}
          onUpdateRow={updatePreviewRow}
          onRemoveRow={removePreviewRow}
          onAddEmptyRow={addPreviewRow}
          disabled={busyCommit}
          processing={previewProcessing}
          processingLabel={
            phase === "listening"
              ? "Listening…"
              : "Processing your transcript into tasks…"
          }
          excludeFromSaveHint="Exclude this row from the next save"
        />
        <p className="mt-2 text-[11px] leading-snug text-kal-muted">
          Tip: changing subject or chapter clears the microtopic link until you pick a
          microtopic again.
        </p>
        {error ? (
          <p
            className="mt-2 text-xs text-[var(--kal-danger-text)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-4 border-t border-kal-border pt-4">
          <button
            type="button"
            disabled={
              busyCommit ||
              !previewRows.some((r) => isPreviewRowIncluded(r))
            }
            onClick={() => void commitPreviewToPlan()}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-6 text-base font-semibold text-white shadow-sm hover:bg-kal-accent-hover disabled:opacity-40"
          >
            {busyCommit ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Adding…
              </>
            ) : (
              addPlanLabel
            )}
          </button>
        </div>
      </section>

      <div id="dictate-live-plan">
        <UnifiedDailyPlanList
          key={planListKey}
          planDate={logDate}
          title={livePlanTitle}
        />
      </div>

      {fallbackPanel ? (
        <section
          className="rounded-[1.25rem] border border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] p-6 kal-shadow-card"
          aria-live="polite"
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--kal-warn-text)]">
            We kept your words
          </p>
          <p className="mt-2 text-sm text-kal-text-secondary">
            Structuring didn&apos;t run this time — add the text to the preview to split
            into tasks, save it as a raw note, or edit first.
          </p>
          {fallbackPanel.editMode ? (
            <textarea
              value={fallbackPanel.text}
              onChange={(e) =>
                setFallbackPanel((p) =>
                  p ? { ...p, text: e.target.value } : p,
                )
              }
              rows={6}
              className="mt-4 w-full resize-y rounded-[1rem] border border-kal-border bg-kal-input-bg px-4 py-3 text-base leading-relaxed text-kal-text placeholder:text-kal-muted"
              placeholder="Edit your note…"
            />
          ) : (
            <p className="kal-glass-subtle mt-4 rounded-[1rem] px-4 py-4 text-lg leading-relaxed text-kal-text">
              {fallbackPanel.text}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={phase === "processing" || !fallbackPanel.text.trim()}
              onClick={() => addFallbackToPreview()}
              className="min-h-[52px] flex-1 rounded-xl bg-kal-accent px-6 text-base font-semibold text-white shadow-sm hover:bg-kal-accent-hover disabled:opacity-40"
            >
              Add to preview
            </button>
            <button
              type="button"
              disabled={phase === "processing" || !fallbackPanel.text.trim()}
              onClick={() => void saveFallbackNote()}
              className="min-h-[52px] flex-1 rounded-xl border-2 border-[var(--kal-warn-border)] bg-white/75 px-6 text-base font-semibold text-[var(--kal-warn-text)] shadow-sm backdrop-blur-sm disabled:opacity-40 dark:bg-zinc-900/70"
            >
              {phase === "processing" ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Saving…
                </span>
              ) : (
                "Save as raw note"
              )}
            </button>
            {!fallbackPanel.editMode ? (
              <button
                type="button"
                disabled={phase === "processing"}
                onClick={() =>
                  setFallbackPanel((p) => (p ? { ...p, editMode: true } : p))
                }
                className="kal-glass-subtle min-h-[52px] flex-1 rounded-xl px-6 text-base font-semibold text-kal-text-secondary disabled:opacity-40"
              >
                Edit text
              </button>
            ) : (
              <button
                type="button"
                disabled={phase === "processing"}
                onClick={() =>
                  setFallbackPanel((p) => (p ? { ...p, editMode: false } : p))
                }
                className="kal-glass-subtle min-h-[52px] flex-1 rounded-xl px-6 text-base font-medium text-kal-text disabled:opacity-40"
              >
                Preview
              </button>
            )}
            <button
              type="button"
              disabled={phase === "processing"}
              onClick={() => setFallbackPanel(null)}
              className="min-h-[48px] rounded-xl border border-white/30 bg-white/45 px-4 text-sm font-medium text-kal-muted backdrop-blur-sm hover:bg-white/65 disabled:opacity-40 dark:border-white/12 dark:bg-zinc-900/45 dark:hover:bg-zinc-900/65"
            >
              Dismiss
            </button>
          </div>
        </section>
      ) : null}

      {recognitionError ? (
        <div
          role="alert"
          className="rounded-[1rem] border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100"
        >
          <span className="font-semibold">Speech: </span>
          {recognitionError}
          <button
            type="button"
            className="ml-3 text-xs font-semibold underline"
            onClick={() => clearRecognitionError()}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-[1rem] border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] px-4 py-3 text-sm text-[var(--kal-danger-text)]"
        >
          <span className="font-semibold">Server: </span>
          {error}
          <button
            type="button"
            className="ml-3 text-xs font-semibold underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
