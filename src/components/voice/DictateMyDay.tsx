"use client";

import { addDays, format, parseISO } from "date-fns";
import {
  Loader2,
  Mic,
  MicOff,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveRawVoiceNote } from "@/actions/voiceDictate";
import type { VoiceDraftTask } from "@/lib/voiceDraftFromGroq";
import { listVoiceTimelineForDate } from "@/actions/voiceTimeline";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { getVoicePlannerSnapshot } from "@/lib/taskIdb";
import { applyOptimisticTaskCreate } from "@/lib/taskMutations";
import { flushOutbox } from "@/lib/sync";
import { formatIstSlotRange12h, minutesBetweenHHMM } from "@/lib/voiceIst";
import {
  persistPlannerSnapshotLocal,
  plannerDurationFromTimeInputs,
  pushPlannerRowsToOutbox,
  rowSyncHash,
  voiceTimelineRowToDraftRow,
  type VoicePlannerTableRow,
} from "@/lib/voicePlannerSync";
import { useAuthStore } from "@/store/useAuthStore";
import type { Task } from "@/store/useTaskStore";

type Phase = "idle" | "listening" | "processing" | "error";

const MAX_SESSION_MS = 60_000;
const SILENCE_END_MS = 5_000;

function normalizeSpeechTranscript(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (out[out.length - 1] === p) continue;
    out.push(p);
  }
  return out.join(" ");
}

const LANGS: { value: string; label: string }[] = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "en-US", label: "English (US) fallback" },
];

function getSpeechRecognitionCtor(): (typeof window)["webkitSpeechRecognition"] | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
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
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  /** Groq failed — user can save raw text or edit first */
  const [fallbackPanel, setFallbackPanel] = useState<{
    text: string;
    editMode: boolean;
  } | null>(null);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [draftTranscript, setDraftTranscript] = useState("");
  const [plannerReady, setPlannerReady] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(true);

  const recRef = useRef<SpeechRecognition | null>(null);
  const finalBufRef = useRef("");
  const interimRef = useRef("");
  const listeningActiveRef = useRef(false);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const cleanupRecognition = useCallback(() => {
    listeningActiveRef.current = false;
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  useEffect(() => () => cleanupRecognition(), [cleanupRecognition]);

  const sendTranscript = useCallback(
    async (transcript: string) => {
      const cleaned = normalizeSpeechTranscript(transcript);
      if (!cleaned) {
        setPhase("idle");
        setError("No speech captured. Try again.");
        return;
      }
      setPhase("processing");
      setError(null);
      try {
        const occurredAt = new Date().toISOString();
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
          setPhase("idle");
          return;
        }
        setFallbackPanel(null);
        const chunk = cleaned;
        const newRows = toDraftRows(res.tasks, chunk);
        setDraftRows((prev) => [...prev, ...newRows]);
        if (user?.id) {
          for (const row of newRows) {
            const id = crypto.randomUUID();
            const now = new Date().toISOString();
            const estimated = minutesBetweenHHMM(
              row.startInput || null,
              row.endInput || null,
            );
            const fullTask: Task = {
              id,
              user_id: user.id,
              assigned_date: logDate,
              status: "pending",
              name: row.name?.trim() || null,
              microtopic_id: null,
              created_at: now,
              updated_at: now,
              estimated_minutes: estimated,
              estimated_time_minutes: estimated,
              end_time: row.endInput || null,
              start_time: row.startInput || null,
              marks_value: null,
              marks_weight: null,
              time_spent_seconds: null,
              source: "voice",
            };
            await applyOptimisticTaskCreate(
              {
                id,
                assigned_date: logDate,
                status: "pending",
                name: row.name?.trim() || null,
                microtopic_id: null,
                start_time: row.startInput || null,
                end_time: row.endInput || null,
                estimated_minutes: estimated,
                estimated_time_minutes: estimated,
                source: "voice",
              },
              user.id,
              fullTask,
            );
          }
        }
        setDraftTranscript((prev) =>
          chunk
            ? prev
              ? `${prev}\n\n---\n\n${chunk}`
              : chunk
            : prev,
        );
        setPhase("idle");
        finalBufRef.current = "";
      } catch {
        setFallbackPanel({ text: cleaned, editMode: false });
        setDraftTranscript((prev) => {
          if (!cleaned) return prev;
          return prev ? `${prev}\n\n---\n\n${cleaned}` : cleaned;
        });
        setPhase("idle");
        finalBufRef.current = "";
      }
    },
    [logDate, user?.id],
  );

  const saveFallbackNote = useCallback(async () => {
    if (!fallbackPanel?.text.trim()) return;
    setPhase("processing");
    setError(null);
    try {
      const res = await saveRawVoiceNote({
        transcript: fallbackPanel.text.trim(),
        log_date: logDate,
        occurred_at: new Date().toISOString(),
      });
      if (!res.ok) {
        setError(res.error);
        setPhase("idle");
        return;
      }
      setFallbackPanel(null);
      setPhase("idle");
      await loadPlanner();
    } catch {
      setError("Could not save. Try again.");
      setPhase("idle");
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

  const flushSession = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (!listeningActiveRef.current) return;
    listeningActiveRef.current = false;

    const full = (finalBufRef.current + interimRef.current).trim();
    finalBufRef.current = "";
    interimRef.current = "";

    if (!full) {
      setPhase("idle");
      setError("No speech captured. Try again.");
      return;
    }
    void sendTranscript(full);
  }, [sendTranscript]);

  const scheduleSilenceStop = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      const rec = recRef.current;
      if (!rec || !listeningActiveRef.current) return;
      try {
        rec.stop();
      } catch {
        try { rec.abort(); } catch { /* ignore */ }
      }
    }, SILENCE_END_MS);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(
        "Speech recognition is not supported in this browser. Try Chrome or your Kalnehi Android app (TWA).",
      );
      setPhase("error");
      return;
    }

    cleanupRecognition();
    listeningActiveRef.current = true;
    finalBufRef.current = "";
    interimRef.current = "";
    setError(null);
    setFallbackPanel(null);
    setPhase("listening");

    const rec = new Ctor();
    recRef.current = rec;
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = lang;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalBufRef.current += event.results[i][0].transcript;
        }
      }
      scheduleSilenceStop();
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === "aborted") return;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      listeningActiveRef.current = false;
      if (ev.error === "no-speech") {
        setPhase("idle");
        return;
      }
      setError(
        ev.error === "not-allowed"
          ? "Microphone permission denied. Allow mic access in browser settings."
          : `Speech error: ${ev.error}`,
      );
      setPhase("error");
    };

    rec.onend = () => {
      flushSession();
    };

    try {
      rec.start();
      sessionTimerRef.current = setTimeout(() => {
        try {
          rec.stop();
        } catch {
          try {
            rec.abort();
          } catch {
            /* ignore */
          }
        }
      }, MAX_SESSION_MS);
    } catch {
      listeningActiveRef.current = false;
      setError("Could not start microphone. Check permissions.");
      setPhase("error");
    }
  }, [cleanupRecognition, lang, flushSession, scheduleSilenceStop]);

  const stopListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    }
  }, []);

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
          Tap the mic and speak in English.
          <br />
          We turn each note into a structured timeline entry (study blocks, breaks,
          mocks, and more).
          <br />
          If the AI ever hiccups, your words are never lost — you can save them as a
          raw note.
        </p>
        <div className="mt-3 max-w-xl rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm leading-relaxed text-kal-muted">
          <p className="font-medium text-kal-text-secondary">
            You may say it like this:
          </p>
          <ul className="mt-2 list-none space-y-1 pl-0">
            <li>• Study kinematics from 10 AM to 11 AM</li>
            <li>• Take a 15 minute break now</li>
            <li>• Revise organic chemistry for next 45 minutes</li>
            <li>• 10 minute gym session after dinner</li>
          </ul>
        </div>
        <p className="mt-3 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2 text-xs leading-relaxed text-kal-muted">
          <span className="font-medium text-kal-text-secondary">Tip:</span> Short bursts work
          best.
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
        <div className="flex flex-col items-center gap-5">
          <button
            type="button"
            disabled={phase === "processing"}
            onClick={() => {
              if (phase === "listening") void stopListening();
              else void startListening();
            }}
            className={[
              "relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[3px] transition-all sm:h-28 sm:w-28",
              phase === "listening"
                ? "border-violet-400 bg-violet-500/30 shadow-[0_0_48px_rgba(139,92,246,0.45)] animate-pulse"
                : "border-violet-500/40 bg-violet-500/15 hover:bg-violet-500/25",
              phase === "processing" ? "opacity-50" : "",
            ].join(" ")}
            aria-pressed={phase === "listening"}
            aria-label={phase === "listening" ? "Stop listening" : "Start listening"}
          >
            {phase === "processing" ? (
              <Loader2 className="h-10 w-10 animate-spin text-violet-200" />
            ) : phase === "listening" ? (
              <MicOff className="h-10 w-10 text-violet-100" />
            ) : (
              <Mic className="h-10 w-10 text-violet-200" />
            )}
          </button>
          <p className="text-sm font-semibold tracking-wide text-kal-text-secondary">
            {phase === "listening"
              ? "Listening…"
              : phase === "processing"
                ? "Processing…"
                : "Ready when you are"}
          </p>
          <p className="max-w-xs text-center text-[11px] text-kal-muted">
            {phase === "listening"
              ? "Speak naturally. Auto-stops after 5 s of silence, or tap to stop manually."
              : phase === "processing"
                ? "Turning your words into a structured plan…"
                : "Tap the mic to start dictating. Short bursts work best."}
          </p>
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
              {phase === "listening" ? "Recording — tasks will appear after you stop." : "Building your task list…"}
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

      {error && (
        <div
          role="alert"
          className="rounded-[1rem] border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] px-4 py-3 text-sm text-[var(--kal-danger-text)]"
        >
          {error}
          <button
            type="button"
            className="ml-3 text-xs font-semibold underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
