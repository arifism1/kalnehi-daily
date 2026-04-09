"use client";

import { format } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  Leaf,
  MoonStar,
  PlayCircle,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  computeMeditationStreak,
  computeMonthTotalSeconds,
  enqueueMeditationOutbox,
  getMeditationSessions,
  updateMeditationSessionNoteLocal,
  upsertMeditationSessionLocal,
  type MeditationOutboxOp,
} from "@/lib/meditationLocal";
import {
  MEDITATION_SOUNDS,
  MEDITATION_TYPES,
  type MeditationSessionRow,
  type MeditationSound,
  type MeditationTypeDef,
} from "@/lib/meditationTypes";
import { flushMeditationOutbox, refreshMeditationFromServer } from "@/lib/meditationSync";
import { useAuthStore } from "@/store/useAuthStore";

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

function formatMinutesAndSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${String(rem).padStart(2, "0")}s`;
}

export function MeditationPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [rows, setRows] = useState<MeditationSessionRow[]>([]);
  const [activeType, setActiveType] = useState<MeditationTypeDef | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(300);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [running, setRunning] = useState(false);
  const [guided, setGuided] = useState(true);
  const [sound, setSound] = useState<MeditationSound>("Rain");
  const [pendingNote, setPendingNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const tickRef = useRef<number | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const autoSaveInFlightRef = useRef(false);

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const monthPrefix = useMemo(() => format(new Date(), "yyyy-MM"), []);
  const streak = useMemo(() => computeMeditationStreak(rows, today), [rows, today]);
  const monthTotalSeconds = useMemo(
    () => computeMonthTotalSeconds(rows, monthPrefix),
    [rows, monthPrefix],
  );
  const elapsedSeconds = useMemo(
    () => Math.max(0, durationSeconds - remainingSeconds),
    [durationSeconds, remainingSeconds],
  );

  const load = useCallback(async () => {
    if (!userId) return;
    const local = await getMeditationSessions(userId);
    setRows(local);
  }, [userId]);

  useEffect(() => {
    synthRef.current = typeof window !== "undefined" ? window.speechSynthesis : null;
  }, []);

  useEffect(() => {
    if (!userId) {
      setHydrating(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      await load();
      await flushMeditationOutbox(userId);
      await refreshMeditationFromServer(userId);
      if (!cancelled) {
        await load();
        setHydrating(false);
      }
    })();
    const onChange = () => void load();
    window.addEventListener("kalnehi-meditation-changed", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("kalnehi-meditation-changed", onChange);
    };
  }, [userId, load]);

  const stopAmbient = useCallback(() => {
    try {
      noiseSourceRef.current?.stop();
    } catch {
      // no-op
    }
    noiseSourceRef.current?.disconnect();
    gainRef.current?.disconnect();
    noiseSourceRef.current = null;
    gainRef.current = null;
  }, []);

  const startAmbient = useCallback(
    async (mode: MeditationSound) => {
      if (typeof window === "undefined") return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      await ctx.resume();
      stopAmbient();
      const gain = ctx.createGain();
      gain.gain.value = 0.03;
      gain.connect(ctx.destination);
      gainRef.current = gain;

      if (mode === "Soft Bells") {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 523;
        const pulse = ctx.createGain();
        pulse.gain.value = 0.0;
        osc.connect(pulse);
        pulse.connect(gain);
        osc.start();
        const pulseInterval = window.setInterval(() => {
          const t = ctx.currentTime;
          pulse.gain.cancelScheduledValues(t);
          pulse.gain.setValueAtTime(0.0, t);
          pulse.gain.linearRampToValueAtTime(0.7, t + 0.03);
          pulse.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
        }, 2200);
        noiseSourceRef.current = osc;
        (noiseSourceRef.current as OscillatorNode).onended = () => window.clearInterval(pulseInterval);
        return;
      }

      if (mode === "Forest" || mode === "Ocean" || mode === "Rain" || mode === "White Noise") {
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
          data[i] = Math.random() * 2 - 1;
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        if (mode === "Ocean") {
          filter.type = "lowpass";
          filter.frequency.value = 700;
          gain.gain.value = 0.035;
        } else if (mode === "Rain") {
          filter.type = "highpass";
          filter.frequency.value = 1500;
        } else if (mode === "Forest") {
          filter.type = "bandpass";
          filter.frequency.value = 900;
        } else {
          filter.type = "lowpass";
          filter.frequency.value = 3000;
        }
        src.connect(filter);
        filter.connect(gain);
        src.start();
        noiseSourceRef.current = src;
      }
    },
    [stopAmbient],
  );

  const guidedSpeak = useCallback((text: string) => {
    if (!guided || typeof window === "undefined") return;
    const synth = synthRef.current;
    if (!synth) return;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 1;
    synth.speak(utter);
  }, [guided]);

  const playEndingChime = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    await ctx.resume();
    const gain = ctx.createGain();
    gain.gain.value = 0.001;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 523;
    osc.connect(gain);
    osc.start();
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    osc.stop(now + 1.45);
  }, []);

  const stopSession = useCallback(() => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    stopAmbient();
    setRunning(false);
  }, [stopAmbient]);

  useEffect(() => () => stopSession(), [stopSession]);

  const saveCompletedSession = useCallback(async () => {
    if (!userId || !activeType) return null;
    if (elapsedSeconds <= 0) return null;
    const now = new Date().toISOString();
    const row: MeditationSessionRow = {
      id: crypto.randomUUID(),
      user_id: userId,
      date: format(new Date(), "yyyy-MM-dd"),
      session_type: activeType.id,
      duration_minutes: Math.max(1, Math.floor(elapsedSeconds / 60)),
      duration_seconds: elapsedSeconds,
      notes: pendingNote.trim() ? pendingNote.trim().slice(0, 1000) : null,
      soundscape: sound,
      guided,
      created_at: now,
    };
    await upsertMeditationSessionLocal(row);
    const op: MeditationOutboxOp = { kind: "session_create", row };
    await enqueueMeditationOutbox(userId, op);
    await flushMeditationOutbox(userId);
    await load();
    setActiveType(null);
    setShowNoteInput(true);
    setLastCompletedSessionId(row.id);
    return row.id;
  }, [activeType, elapsedSeconds, guided, load, pendingNote, sound, userId]);

  const completeSession = useCallback(async () => {
    if (autoSaveInFlightRef.current) return;
    autoSaveInFlightRef.current = true;
    try {
      stopSession();
      await playEndingChime();
      guidedSpeak("Beautiful work. Session complete. Session saved.");
      await saveCompletedSession();
    } finally {
      autoSaveInFlightRef.current = false;
    }
  }, [guidedSpeak, playEndingChime, saveCompletedSession, stopSession]);

  const beginSession = useCallback(
    async (type: MeditationTypeDef, minutes: number) => {
      const sec = Math.max(60, Math.round(minutes * 60));
      setActiveType(type);
      setDurationSeconds(sec);
      setRemainingSeconds(sec);
      setPendingNote("");
      setShowNoteInput(false);
      setLastCompletedSessionId(null);
      setRunning(true);
      await startAmbient(sound);
      guidedSpeak(`${type.title}. Settle into your breath and begin.`);
    },
    [guidedSpeak, sound, startAmbient],
  );

  useEffect(() => {
    if (!running) return;
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          void completeSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [running, completeSession]);

  const saveNoteForCompletedSession = useCallback(async () => {
    if (!userId || !lastCompletedSessionId) return;
    const note = pendingNote.trim() ? pendingNote.trim().slice(0, 1000) : null;
    const updatedAt = new Date().toISOString();
    await updateMeditationSessionNoteLocal(userId, lastCompletedSessionId, note, updatedAt);
    const op: MeditationOutboxOp = {
      kind: "session_note_update",
      sessionId: lastCompletedSessionId,
      note,
      updatedAt,
    };
    await enqueueMeditationOutbox(userId, op);
    await flushMeditationOutbox(userId);
    await load();
    setShowNoteInput(false);
    setPendingNote("");
    setLastCompletedSessionId(null);
  }, [lastCompletedSessionId, load, pendingNote, userId]);

  const calendar = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const done = new Set(rows.map((r) => r.date));
    const cells: Array<{ day: number; key: string; done: boolean }> = [];
    for (let d = 1; d <= last.getDate(); d += 1) {
      const key = format(new Date(y, m, d), "yyyy-MM-dd");
      cells.push({ day: d, key, done: done.has(key) });
    }
    return { cells, startOffset: first.getDay() };
  }, [rows]);

  if (!userId) {
    return <div className="rounded-2xl border border-kal-border bg-kal-card p-6">Sign in to use Meditation.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-12">
      <header className="rounded-3xl border border-kal-border bg-gradient-to-br from-[#f2f9f6] via-kal-card to-[#eef6ff] p-7">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-kal-accent">Mind training</p>
        <h1 className="mt-2 text-3xl font-bold text-kal-text">Meditation</h1>
        <p className="mt-2 text-kal-muted">Train your mind · Sharpen your focus</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MEDITATION_TYPES.map((item) => (
          <article key={item.id} className="rounded-2xl border border-kal-border bg-kal-card p-5 kal-shadow-card">
            <h2 className="text-base font-semibold text-kal-text">{item.title}</h2>
            <p className="mt-2 text-sm text-kal-text-secondary">{item.description}</p>
            <p className="mt-2 text-sm font-medium text-kal-accent">{item.benefit}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-kal-muted">Recommended: {item.durationLabel}</p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void beginSession(item, item.durationRangeMinutes[0])}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-kal-accent px-4 text-sm font-semibold text-kal-accent-foreground"
              >
                <PlayCircle className="h-4 w-4" />
                Start
              </button>
            </div>
          </article>
        ))}
      </section>
      <Link
        href="/meditation/consistency"
        className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-kal-border bg-kal-card px-4 py-3 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-card-muted"
      >
        <CalendarDays className="h-5 w-5 text-kal-accent" />
        View Meditation Consistency
      </Link>

      <section className="rounded-2xl border border-kal-border bg-kal-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Timer className="h-5 w-5 text-kal-accent" />
          <p className="text-sm font-semibold text-kal-text">Meditation Session</p>
          <span className="text-sm text-kal-muted">{activeType ? activeType.title : "Select a meditation to begin"}</span>
        </div>
        <div className="mt-4 text-5xl font-bold tabular-nums text-kal-text">{formatClock(remainingSeconds)}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!running ? (
            <button
              type="button"
              disabled={!activeType || remainingSeconds <= 0}
              onClick={() => setRunning(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-kal-border px-3 py-2 text-sm"
            >
              <CirclePlay className="h-4 w-4" />
              Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                stopAmbient();
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-kal-border px-3 py-2 text-sm"
            >
              <CirclePause className="h-4 w-4" />
              Pause
            </button>
          )}
          <button
            type="button"
            onClick={() => void completeSession()}
            disabled={!activeType}
            className="rounded-xl bg-kal-accent px-3 py-2 text-sm font-semibold text-kal-accent-foreground disabled:opacity-40"
          >
            Complete session
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-kal-border bg-kal-page p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-kal-muted">Mode</p>
            <button
              type="button"
              onClick={() => setGuided((v) => !v)}
              className="mt-2 inline-flex items-center rounded-full border border-kal-border px-3 py-1.5 text-sm"
            >
              {guided ? "Guided audio (voice)" : "Silent mode"}
            </button>
          </div>
          <div className="rounded-xl border border-kal-border bg-kal-page p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-kal-muted">Background sound</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MEDITATION_SOUNDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSound(s);
                    if (running) void startAmbient(s);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    sound === s
                      ? "bg-kal-accent-soft text-kal-accent ring-1 ring-kal-accent/40"
                      : "bg-kal-card-muted text-kal-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showNoteInput ? (
          <div className="mt-5 rounded-xl border border-kal-border bg-kal-page p-4">
            <p className="text-sm font-semibold text-kal-text">Add a short reflection note</p>
            <textarea
              value={pendingNote}
              onChange={(e) => setPendingNote(e.target.value)}
              placeholder="How did you feel after this session?"
              rows={3}
              className="mt-2 w-full rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void saveNoteForCompletedSession()}
              disabled={!lastCompletedSessionId}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-kal-accent px-4 py-2 text-sm font-semibold text-kal-accent-foreground"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save note
            </button>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-kal-border bg-kal-card p-5">
          <p className="text-xs uppercase tracking-wide text-kal-muted">Daily streak</p>
          <div className="mt-3 flex items-center gap-4">
            <div
              className="relative h-20 w-20 rounded-full"
              style={{
                background: `conic-gradient(var(--kal-accent) ${Math.min(100, streak * 12)}%, #d7e7de 0)`,
              }}
            >
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-kal-card text-lg font-bold text-kal-text">
                {streak}
              </div>
            </div>
            <p className="text-sm text-kal-text-secondary">days in a row</p>
          </div>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card p-5">
          <p className="text-xs uppercase tracking-wide text-kal-muted">Total minutes this month</p>
          <p className="mt-3 text-3xl font-bold tabular-nums text-kal-text">
            {formatMinutesAndSeconds(monthTotalSeconds)}
          </p>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card p-5">
          <p className="text-xs uppercase tracking-wide text-kal-muted">Sessions completed</p>
          <p className="mt-3 text-3xl font-bold tabular-nums text-kal-text">{rows.length}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-kal-border bg-kal-card p-6">
        <h3 className="text-sm font-semibold text-kal-text">Calendar view</h3>
        <div className="mt-4 grid grid-cols-7 gap-2 text-center">
          {Array.from({ length: calendar.startOffset }).map((_, i) => (
            <div key={`offset-${i}`} />
          ))}
          {calendar.cells.map((c) => (
            <div
              key={c.key}
              className={`rounded-lg px-2 py-2 text-sm ${
                c.done ? "bg-kal-accent-soft text-kal-accent" : "bg-kal-card-muted text-kal-muted"
              }`}
            >
              {c.day}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-kal-border bg-kal-card p-6">
        <h3 className="text-sm font-semibold text-kal-text">Past sessions</h3>
        {hydrating ? <p className="mt-3 text-sm text-kal-muted">Loading…</p> : null}
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 25).map((r) => (
            <li key={r.id} className="rounded-xl border border-kal-border bg-kal-page p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-kal-text">
                  {MEDITATION_TYPES.find((t) => t.id === r.session_type)?.title ?? r.session_type}
                </p>
                <p className="text-kal-muted">{r.date}</p>
              </div>
              <p className="mt-1 text-kal-text-secondary">
                {Math.round(r.duration_seconds / 60)} min · {r.guided ? "Guided" : "Silent"} · {r.soundscape ?? "No sound"}
              </p>
              {r.notes ? <p className="mt-1 text-kal-muted">{r.notes}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 rounded-2xl border border-kal-border bg-gradient-to-r from-[#edf7f2] to-[#ebf4ff] p-5 md:grid-cols-2">
        <button
          type="button"
          onClick={() => void beginSession(MEDITATION_TYPES[4], 2)}
          className="rounded-xl border border-kal-border bg-kal-card px-4 py-3 text-left"
        >
          <p className="text-sm font-semibold text-kal-text">Quick Meditation - 2 min reset</p>
          <p className="mt-1 text-xs text-kal-muted">Quick Anxiety Reset before a study sprint</p>
        </button>
        <button
          type="button"
          onClick={() => void beginSession(MEDITATION_TYPES[0], 5)}
          className="rounded-xl border border-kal-border bg-kal-card px-4 py-3 text-left"
        >
          <p className="text-sm font-semibold text-kal-text">Quick Meditation - 5 min focus</p>
          <p className="mt-1 text-xs text-kal-muted">Focus Breath for deep work mode</p>
        </button>
      </section>

      <div className="hidden">
        <Leaf />
        <MoonStar />
      </div>
    </div>
  );
}
