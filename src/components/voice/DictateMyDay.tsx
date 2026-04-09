"use client";

import { addDays, format, parseISO } from "date-fns";
import { Loader2, Mic, Plus, Trash2, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveRawVoiceNote } from "@/actions/voiceDictate";
import type { VoiceDraftTask } from "@/lib/voiceDraftFromGroq";
import { listVoiceTimelineForDate } from "@/actions/voiceTimeline";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { getVoicePlannerSnapshot } from "@/lib/taskIdb";
import { flushOutbox } from "@/lib/sync";
import { formatIstSlotRange12h } from "@/lib/voiceIst";
import {
  persistPlannerSnapshotLocal,
  plannerDurationFromTimeInputs,
  pushPlannerRowsToOutbox,
  rowSyncHash,
  voiceTimelineRowToDraftRow,
  type VoicePlannerTableRow,
} from "@/lib/voicePlannerSync";
import { useAuthStore } from "@/store/useAuthStore";

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

type DraftRow = VoicePlannerTableRow;

function toDraftRows(
  tasks: VoiceDraftTask[],
  transcriptChunk: string,
): DraftRow[] {
  const chunk = transcriptChunk.slice(0, 12_000);
  return tasks.map((t) => ({
    id: crypto.randomUUID(),
    /** Voice-parsed rows start unchecked; user ticks to include in the plan. */
    include: false,
    name: t.taskTitle?.trim() ?? "",
    startInput: t.start_time ?? "",
    endInput: t.end_time ?? "",
    duration: t.duration ?? null,
    transcriptRaw: chunk,
  }));
}

function emptyDraftRow(): DraftRow {
  return {
    id: crypto.randomUUID(),
    include: true,
    name: "",
    startInput: "",
    endInput: "",
    duration: null,
  };
}

/** Fingerprint of planner state for autosave — skips redundant outbox work after load. */
function voicePlannerAutosaveSig(
  rows: DraftRow[],
  transcript: string,
): string {
  return JSON.stringify({
    t: transcript.trim(),
    rows: rows.map((r) => ({ id: r.id, h: rowSyncHash(r) })),
  });
}

const PERSIST_LOCAL_MS = 80;
const PUSH_OUTBOX_MS = 320;

export function DictateMyDay() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const [logDate, setLogDate] = useState(today);
  const [lang, setLang] = useState("en-IN");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  /** Groq failed — user can save raw text or edit first */
  const [fallbackPanel, setFallbackPanel] = useState<{
    text: string;
    editMode: boolean;
  } | null>(null);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [draftTranscript, setDraftTranscript] = useState("");
  const [plannerReady, setPlannerReady] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(true);

  /** Row ids known to exist on Supabase for this log date (drives create vs update). */
  const serverKnownIdsRef = useRef<Set<string>>(new Set());
  const prevDraftIdsRef = useRef<Set<string>>(new Set());
  const rowHashRef = useRef<Record<string, string>>({});
  const pendingCreateIdsRef = useRef<Set<string>>(new Set());
  const loadPlannerGenRef = useRef(0);
  /** Last planner state we pushed (or loaded); avoids duplicate voice_timeline outbox ops. */
  const autosaveSigRef = useRef<string | null>(null);
  const draftRowsRef = useRef(draftRows);
  const draftTranscriptRef = useRef(draftTranscript);
  draftRowsRef.current = draftRows;
  draftTranscriptRef.current = draftTranscript;

  const loadPlanner = useCallback(async () => {
    const gen = ++loadPlannerGenRef.current;
    const fresh = () => gen === loadPlannerGenRef.current;

    if (!user?.id) {
      autosaveSigRef.current = null;
      setDraftRows([]);
      setDraftTranscript("");
      setPlannerReady(false);
      setPlannerLoading(false);
      return;
    }
    setPlannerReady(false);
    setPlannerLoading(true);
    const uid = user.id;

    try {
      const snap = await getVoicePlannerSnapshot(uid, logDate);
      if (!fresh()) return;
      const serverRes = await listVoiceTimelineForDate(logDate);
      if (!fresh()) return;

      if (serverRes.ok) {
        if (serverRes.entries.length > 0) {
          const rows = serverRes.entries
            .slice()
            .reverse()
            .map(voiceTimelineRowToDraftRow);
          const agg = [
            ...new Set(
              serverRes.entries.map((e) => e.transcript_raw).filter(Boolean),
            ),
          ].join("\n\n---\n\n");

          if (!fresh()) return;
          autosaveSigRef.current = voicePlannerAutosaveSig(rows, agg);
          setDraftRows(rows);
          setDraftTranscript(agg);
          serverKnownIdsRef.current = new Set(rows.map((r) => r.id));
          pendingCreateIdsRef.current.clear();
          const hashes: Record<string, string> = {};
          for (const r of rows) {
            hashes[r.id] = rowSyncHash(r);
          }
          rowHashRef.current = hashes;
          prevDraftIdsRef.current = new Set(rows.map((r) => r.id));
          await persistPlannerSnapshotLocal(uid, logDate, rows, agg);
        } else {
          if (
            snap &&
            snap.userId === uid &&
            snap.logDate === logDate &&
            snap.rows.length > 0
          ) {
            if (!fresh()) return;
            autosaveSigRef.current = voicePlannerAutosaveSig(
              snap.rows,
              snap.transcriptAggregate,
            );
            setDraftRows(snap.rows);
            setDraftTranscript(snap.transcriptAggregate);
            serverKnownIdsRef.current = new Set();
            pendingCreateIdsRef.current.clear();
            const hashes: Record<string, string> = {};
            for (const r of snap.rows) {
              hashes[r.id] = rowSyncHash(r);
            }
            rowHashRef.current = hashes;
            prevDraftIdsRef.current = new Set(snap.rows.map((r) => r.id));
            await persistPlannerSnapshotLocal(
              uid,
              logDate,
              snap.rows,
              snap.transcriptAggregate,
            );
          } else {
            if (!fresh()) return;
            autosaveSigRef.current = voicePlannerAutosaveSig([], "");
            setDraftRows([]);
            setDraftTranscript("");
            serverKnownIdsRef.current = new Set();
            pendingCreateIdsRef.current.clear();
            rowHashRef.current = {};
            prevDraftIdsRef.current = new Set();
            await persistPlannerSnapshotLocal(uid, logDate, [], "");
          }
        }
      } else {
        if (!fresh()) return;
        setError(serverRes.error);
        if (snap && snap.userId === uid && snap.logDate === logDate) {
          autosaveSigRef.current = voicePlannerAutosaveSig(
            snap.rows,
            snap.transcriptAggregate,
          );
          setDraftRows(snap.rows);
          setDraftTranscript(snap.transcriptAggregate);
          serverKnownIdsRef.current = new Set();
          pendingCreateIdsRef.current.clear();
          const hashes: Record<string, string> = {};
          for (const r of snap.rows) {
            hashes[r.id] = rowSyncHash(r);
          }
          rowHashRef.current = hashes;
          prevDraftIdsRef.current = new Set(snap.rows.map((r) => r.id));
          await persistPlannerSnapshotLocal(
            uid,
            logDate,
            snap.rows,
            snap.transcriptAggregate,
          );
        }
      }
    } finally {
      if (fresh()) {
        setPlannerLoading(false);
        setPlannerReady(true);
      }
    }
  }, [user, logDate]);

  useEffect(() => {
    void loadPlanner();
  }, [loadPlanner]);

  useEffect(() => {
    setLogDate(today);
  }, [today]);

  useEffect(() => {
    setFallbackPanel(null);
  }, [logDate]);

  /**
   * Voice-only autosave: `voice_planner_snapshots` in IndexedDB + `voice_timeline_*`
   * outbox mutations (see `voicePlannerSync` / `sync.ts`). Does not touch tasks or handwritten tables.
   */
  useEffect(() => {
    if (!user?.id || !plannerReady) return;
    const uid = user.id;
    const rows = draftRowsRef.current;
    const transcript = draftTranscriptRef.current;
    const sig = voicePlannerAutosaveSig(rows, transcript);
    if (sig === autosaveSigRef.current) return;

    const idbT = setTimeout(() => {
      void persistPlannerSnapshotLocal(
        uid,
        logDate,
        draftRowsRef.current,
        draftTranscriptRef.current,
      );
    }, PERSIST_LOCAL_MS);

    const syncT = setTimeout(() => {
      void (async () => {
        const r = draftRowsRef.current;
        const t = draftTranscriptRef.current;
        const sigNow = voicePlannerAutosaveSig(r, t);
        if (sigNow === autosaveSigRef.current) return;
        await pushPlannerRowsToOutbox({
          userId: uid,
          logDate,
          transcriptAggregate: t,
          draftRows: r,
          serverKnownIds: serverKnownIdsRef.current,
          prevIdsRef: prevDraftIdsRef,
          rowHashRef,
          pendingCreateIdsRef,
        });
        autosaveSigRef.current = sigNow;
      })();
    }, PUSH_OUTBOX_MS);

    return () => {
      clearTimeout(idbT);
      clearTimeout(syncT);
    };
  }, [draftRows, draftTranscript, logDate, user, plannerReady]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    const onPlannerSynced = () => {
      void (async () => {
        const res = await listVoiceTimelineForDate(logDate);
        if (!res.ok) return;
        serverKnownIdsRef.current = new Set(res.entries.map((e) => e.id));
        for (const id of [...pendingCreateIdsRef.current]) {
          if (serverKnownIdsRef.current.has(id)) {
            pendingCreateIdsRef.current.delete(id);
          }
        }
      })();
    };
    window.addEventListener("kalnehi-voice-planner-synced", onPlannerSynced);
    return () => {
      window.removeEventListener(
        "kalnehi-voice-planner-synced",
        onPlannerSynced,
      );
    };
  }, [logDate, user?.id]);

  const sendTranscript = useCallback(
    async (transcript: string, occurredAt: string) => {
      const cleaned = normalizeSpeechTranscript(transcript);
      if (!cleaned) {
        setError("No speech captured. Try again.");
        return;
      }
      setIsProcessing(true);
      setError(null);
      try {
        const parseRes = await fetch("/api/voice-parse-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: cleaned,
            log_date: logDate,
            occurred_at: occurredAt,
          }),
        });
        const res = (await parseRes.json()) as
          | { ok: true; tasks: VoiceDraftTask[] }
          | { ok: false; error: string; openRawFallback?: boolean };

        if (!res.ok) {
          if (res.openRawFallback) {
            setFallbackPanel({ text: cleaned, editMode: false });
            setError(null);
          } else {
            setError(res.error);
          }
          return;
        }
        setFallbackPanel(null);
        const chunk = cleaned;
        const newRows = toDraftRows(res.tasks, chunk);
        setDraftRows((prev) => [...prev, ...newRows]);
        setDraftTranscript((prev) =>
          chunk
            ? prev
              ? `${prev}\n\n---\n\n${chunk}`
              : chunk
            : prev,
        );
      } catch {
        setFallbackPanel({ text: cleaned, editMode: false });
        setDraftTranscript((prev) => {
          if (!cleaned) return prev;
          return prev ? `${prev}\n\n---\n\n${cleaned}` : cleaned;
        });
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
    onTranscript: ({ transcript, occurredAt }) => {
      void sendTranscript(transcript, occurredAt);
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
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFallbackPanel(null);
      await loadPlanner();
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [fallbackPanel, logDate, loadPlanner]);

  const updateDraftRow = useCallback((id: string, patch: Partial<DraftRow>) => {
    setDraftRows((prev) =>
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
  }, []);

  const removeDraftRow = useCallback((id: string) => {
    setDraftRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addDraftRow = useCallback(() => {
    setDraftRows((prev) => [...prev, emptyDraftRow()]);
  }, []);

  /** Immediate flush of pending voice_timeline outbox ops (rows already enqueue on edit). */
  const confirmFinalizeSync = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      await flushOutbox(user.id);
    } catch {
      setError("Could not sync pending changes. Check connection and try again.");
    }
  }, [user]);

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
        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold text-kal-text">
          <Volume2 className="h-8 w-8 text-kal-accent" aria-hidden />
          Dictate My Day
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-kal-muted">
          Transcription happens on your device with the browser&apos;s speech engine.
          Only the final text is sent to Groq so it can turn your note into clean,
          editable draft tasks.
        </p>
        <p className="mt-3 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2 text-xs leading-relaxed text-kal-muted">
          <span className="font-medium text-kal-text-secondary">Tip:</span> Speak
          naturally, then tap Stop when you&apos;re done.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-h-[44px] items-center gap-1 rounded-xl border border-kal-border bg-kal-card-muted p-1">
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
          Log date
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

      <section className="rounded-[1.25rem] border border-kal-border bg-kal-card kal-shadow-card p-6 sm:p-8">
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
              className="min-h-[44px] rounded-xl border border-kal-border px-4 py-2 text-sm font-semibold text-kal-text-secondary hover:bg-kal-card-muted"
            >
              Stop
            </button>
          ) : null}
          {phase === "idle" ? (
            <p className="max-w-sm text-sm text-kal-muted">
              Voice transcription stays on this device. Groq only receives the final text
              after recording ends.
            </p>
          ) : null}
          {!isSupported ? (
            <p className="max-w-sm text-sm text-[var(--kal-warn-text)]">
              Device speech recognition is unavailable in this browser. Try Chrome or the
              Kalnehi Android app.
            </p>
          ) : null}
        </div>
      </section>

      <section className="relative rounded-[1.25rem] border border-kal-border bg-kal-card kal-shadow-card p-4 sm:p-6">
        {plannerLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.25rem] bg-kal-card/90 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-kal-accent" />
          </div>
        ) : (phase === "listening" || phase === "processing") ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-kal-accent" />
            <p className="text-sm text-kal-muted">
              {phase === "listening"
                ? "Listening..."
                : "Processing your final transcript into tasks..."}
            </p>
          </div>
        ) : null}
        {(phase === "listening" || phase === "processing") ? null : (
          <>
        
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-kal-text">Dictate My Day planner</h2>
          <span className="text-xs text-kal-muted">{logDate}</span>
        </div>
        {draftRows.length === 0 ? (
          <p className="mt-6 rounded-[1rem] border border-dashed border-kal-border py-10 text-center text-sm text-kal-muted">
            No tasks for this day yet—dictate above or tap &quot;Add row&quot;.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {draftRows.map((r) => (
              <li
                key={r.id}
                className="min-w-0 space-y-2 overflow-hidden rounded-xl border border-kal-border bg-kal-card-muted p-2.5"
              >
                <div className="min-w-0 grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-2">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={() => updateDraftRow(r.id, { include: !r.include })}
                    className="mt-2 h-5 w-5 rounded border-kal-border accent-kal-accent"
                    aria-label="Include row"
                  />
                  <div className="min-w-0">
                    <textarea
                      value={r.name}
                      onChange={(e) => updateDraftRow(r.id, { name: e.target.value })}
                      placeholder="Task name"
                      rows={1}
                      className="min-h-[40px] min-w-0 w-full resize-y overflow-hidden rounded-lg border border-kal-border bg-kal-input-bg px-2 py-2 text-sm font-semibold leading-5 text-kal-text placeholder:text-kal-muted [overflow-wrap:anywhere]"
                      aria-label="Task name"
                    />
                    <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[11px] text-kal-muted">
                      <input
                        type="time"
                        value={r.startInput}
                        onChange={(e) =>
                          updateDraftRow(r.id, { startInput: e.target.value })
                        }
                        className="min-h-[32px] rounded-md border border-kal-border bg-kal-input-bg px-2 text-[11px] text-kal-text"
                        aria-label="From time (IST)"
                      />
                      <span className="shrink-0">•</span>
                      <span className="truncate font-semibold text-kal-text-secondary">
                        {r.duration ?? "—"}
                      </span>
                      <input
                        type="time"
                        value={r.endInput}
                        onChange={(e) =>
                          updateDraftRow(r.id, { endInput: e.target.value })
                        }
                        className="ml-auto min-h-[32px] rounded-md border border-kal-border bg-kal-input-bg px-2 text-[11px] text-kal-text"
                        aria-label="To time (IST)"
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-medium tracking-tight text-kal-accent-dark dark:text-kal-accent">
                      {formatIstSlotRange12h(r.startInput, r.endInput)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDraftRow(r.id)}
                    className="mt-1 rounded-lg border border-rose-500/30 p-2 text-rose-300 hover:bg-rose-950/40"
                    aria-label="Delete row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={addDraftRow}
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-kal-border px-3 py-2 text-sm text-kal-text-secondary hover:bg-kal-card-muted"
        >
          <Plus className="h-4 w-4" />
          Add row
        </button>
        <button
          type="button"
          onClick={() => void confirmFinalizeSync()}
          className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-6 text-base font-semibold text-white shadow-sm hover:bg-kal-accent-hover"
        >
          Sync voice timeline now
        </button>
          </>
        )}
      </section>

      {fallbackPanel ? (
        <section
          className="rounded-[1.25rem] border border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] p-6 kal-shadow-card"
          aria-live="polite"
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--kal-warn-text)]">
            We kept your words
          </p>
          <p className="mt-2 text-sm text-kal-text-secondary">
            Structuring didn&apos;t run this time—your note is safe below. Save it as-is
            or tweak the text, then save.
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
            <p className="mt-4 rounded-[1rem] border border-kal-border bg-kal-card-muted px-4 py-4 text-lg leading-relaxed text-kal-text">
              {fallbackPanel.text}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={phase === "processing" || !fallbackPanel.text.trim()}
              onClick={() => void saveFallbackNote()}
              className="min-h-[52px] flex-1 rounded-xl bg-kal-accent px-6 text-base font-semibold text-white shadow-sm hover:bg-kal-accent-hover disabled:opacity-40"
            >
              {phase === "processing" ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Saving…
                </span>
              ) : (
                "Save this note anyway"
              )}
            </button>
            {!fallbackPanel.editMode ? (
              <button
                type="button"
                disabled={phase === "processing"}
                onClick={() =>
                  setFallbackPanel((p) => (p ? { ...p, editMode: true } : p))
                }
                className="min-h-[52px] flex-1 rounded-xl border-2 border-[var(--kal-warn-border)] bg-kal-card px-6 text-base font-semibold text-[var(--kal-warn-text)] disabled:opacity-40"
              >
                Edit before saving
              </button>
            ) : (
              <button
                type="button"
                disabled={phase === "processing"}
                onClick={() =>
                  setFallbackPanel((p) => (p ? { ...p, editMode: false } : p))
                }
                className="min-h-[52px] flex-1 rounded-xl border border-kal-border bg-kal-card-muted px-6 text-base font-medium text-kal-text disabled:opacity-40"
              >
                Preview
              </button>
            )}
            <button
              type="button"
              disabled={phase === "processing"}
              onClick={() => setFallbackPanel(null)}
              className="min-h-[48px] rounded-xl border border-kal-border px-4 text-sm font-medium text-kal-muted hover:bg-kal-card-muted disabled:opacity-40"
            >
              Dismiss
            </button>
          </div>
        </section>
      ) : null}

      {activeError && (
        <div
          role="alert"
          className="rounded-[1rem] border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] px-4 py-3 text-sm text-[var(--kal-danger-text)]"
        >
          {activeError}
          <button
            type="button"
            className="ml-3 text-xs font-semibold underline"
            onClick={() => {
              setError(null);
              clearRecognitionError();
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
