"use client";

import Link from "next/link";
import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  commitBacklogSchedule,
  previewBacklogSchedule,
  type OrganizedBacklogItemInput,
} from "@/actions/backlogRecovery";
import {
  BACKLOG_TRACKER_PREFILL_KEY,
  BACKLOG_TIME_MAX_CAP,
  BACKLOG_TIME_MIN_CAP,
  BACKLOG_TIME_STEP_MINUTES,
  type BacklogTrackerPrefillV1,
} from "@/lib/backlogRecoveryConstants";
import type { BacklogScheduleIntensity } from "@/lib/backlogRecoveryScheduling";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import {
  VOICE_LONG_FORM_MAX_SESSION_MS,
  VOICE_LONG_FORM_SILENCE_MS,
} from "@/lib/voiceConstants";
import { trackMetaBacklogAdded, trackMetaBacklogPlanLocked } from "@/lib/analytics";
import { useAuthStore } from "@/store/useAuthStore";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { AiFeatureGate } from "@/components/subscription/AiFeatureGate";

type OrganizeItem = {
  title: string;
  syllabus_master_id?: string | null;
  group_label?: string | null;
};

type Phase = "vent" | "time" | "preview";

function clampMinutes(m: number): number {
  const s = Math.round(m / BACKLOG_TIME_STEP_MINUTES) * BACKLOG_TIME_STEP_MINUTES;
  return Math.max(BACKLOG_TIME_MIN_CAP, Math.min(BACKLOG_TIME_MAX_CAP, s));
}

export function BacklogTrackerClient() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();

  const [transcript, setTranscript] = useState("");
  const [directTranscript, setDirectTranscript] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [items, setItems] = useState<OrganizeItem[]>([]);
  /** Parallel to `items`: user-set minutes, or from DB for existing rows */
  const [minutesList, setMinutesList] = useState<number[]>([]);
  const [itemMeta, setItemMeta] = useState<OrganizedBacklogItemInput[]>([]);
  const [timeIdx, setTimeIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("vent");
  const [intensity, setIntensity] = useState<BacklogScheduleIntensity>("heavier");

  const [previewHeadline, setPreviewHeadline] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<
    {
      plan_date: string;
      title: string;
      estimated_minutes: number;
      group_label: string | null;
    }[]
  >([]);
  const [previewPerDay, setPreviewPerDay] = useState(3);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"partial" | "final" | "preview" | "commit" | null>(null);
  const partialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userLocalHour = useMemo(() => new Date().getHours(), []);

  const appendCapturedBatch = useCallback((organizeItems: OrganizeItem[]) => {
    if (organizeItems.length === 0) return;
    setItems((prev) => [...prev, ...organizeItems]);
    setMinutesList((prev) => [...prev, ...organizeItems.map(() => 60)]);
    setItemMeta((prev) => [
      ...prev,
      ...organizeItems.map((it) => ({
        title: it.title,
        syllabus_master_id: it.syllabus_master_id,
        group_label: it.group_label,
        details: "",
        effort_estimate_minutes: null,
      })),
    ]);
  }, []);

  const removeCapturedItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setMinutesList((prev) => prev.filter((_, i) => i !== idx));
    setItemMeta((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const runOrganize = useCallback(async (mode: "partial" | "final", text: string) => {
    const t = text.trim();
    if (t.length < 4) return;
    setBusy(mode);
    setLiveError(null);
    try {
      const res = await fetch("/api/backlog-organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transcript: t, mode }),
      });
      const data = (await res.json()) as
        | { ok: true; items: OrganizeItem[]; chips: string[] }
        | { ok: false; error: string };
      if (!data.ok) {
        setLiveError(data.error);
        return;
      }
      if (mode === "partial") {
        setChips(data.chips ?? []);
      } else {
        setChips([]);
        appendCapturedBatch(data.items ?? []);
        trackMetaBacklogAdded();
      }
    } catch {
      setLiveError("Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }, [appendCapturedBatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(BACKLOG_TRACKER_PREFILL_KEY);
    if (!raw) return;
    sessionStorage.removeItem(BACKLOG_TRACKER_PREFILL_KEY);
    try {
      const p = JSON.parse(raw) as BacklogTrackerPrefillV1;
      if (p.v !== 1) return;

      if (Array.isArray(p.staged_items) && p.staged_items.length > 0) {
        const rows = p.staged_items.map((s) => ({
          title: String(s.title ?? "").trim().slice(0, 500),
          syllabus_master_id: s.syllabus_master_id ?? null,
          group_label: s.group_label ?? null,
        })).filter((r) => r.title.length > 0);
        if (rows.length === 0) return;
        setItems(rows);
        setMinutesList(rows.map(() => 60));
        setItemMeta(
          rows.map((r) => ({
            title: r.title,
            details: "",
            syllabus_master_id: r.syllabus_master_id,
            group_label: r.group_label,
            effort_estimate_minutes: null,
          })),
        );
        setTimeIdx(0);
        setPhase("time");
        return;
      }

      if (p.load_existing_rows && user?.id && Array.isArray(p.backlog_ids) && p.backlog_ids.length > 0) {
        const ids = p.backlog_ids;
        void (async () => {
          const supabase = getSupabaseBrowserClient();
          const { data, error } = await supabase
            .from("user_syllabus_backlog")
            .select(
              "id, title, details, group_label, syllabus_master_id, effort_estimate_minutes, retry_count, last_attempt_date",
            )
            .in("id", ids)
            .eq("status", "pending");
          if (error || !data?.length) {
            if (p.titles?.length) setTranscript(p.titles.join("\n"));
            return;
          }
          const rows = data.map((r) => ({
            title: r.title,
            syllabus_master_id: r.syllabus_master_id,
            group_label: r.group_label,
          }));
          setItems(rows);
          setMinutesList(
            data.map((r) =>
              clampMinutes(
                typeof r.effort_estimate_minutes === "number" &&
                  Number.isFinite(r.effort_estimate_minutes)
                  ? r.effort_estimate_minutes
                  : 60,
              ),
            ),
          );
          setItemMeta(
            data.map((r) => ({
              title: r.title,
              details: r.details ?? "",
              syllabus_master_id: r.syllabus_master_id,
              group_label: r.group_label,
              effort_estimate_minutes: r.effort_estimate_minutes,
              existing_backlog_id: r.id,
              retry_count: r.retry_count ?? 0,
              last_attempt_date: r.last_attempt_date ?? null,
            })),
          );
          setTimeIdx(0);
          setPhase("time");
        })();
        return;
      }

      if (p.titles?.length) {
        setTranscript(p.titles.join("\n"));
        return;
      }
      if (!user?.id || !Array.isArray(p.backlog_ids) || p.backlog_ids.length === 0) return;
      const backlogIdsForTitles = p.backlog_ids;
      void (async () => {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from("user_syllabus_backlog")
          .select("title")
          .in("id", backlogIdsForTitles);
        const titles = (data ?? []).map((r) => r.title).filter(Boolean);
        if (titles.length) setTranscript(titles.join("\n"));
      })();
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useEffect(() => {
    if (phase !== "vent") return;
    const t = transcript.trim();
    if (t.length < 8) {
      setChips([]);
      return;
    }
    if (partialTimer.current) clearTimeout(partialTimer.current);
    partialTimer.current = setTimeout(() => {
      void runOrganize("partial", t);
    }, 700);
    return () => {
      if (partialTimer.current) clearTimeout(partialTimer.current);
    };
  }, [transcript, runOrganize, phase]);

  const appendTranscript = useCallback((chunk: string) => {
    const c = chunk.trim();
    if (!c) return;
    setTranscript((prev) => (prev ? `${prev} ${c}` : c));
  }, []);

  const { isListening, isSupported, startListening, stopListening, error: recError } =
    useDeviceSpeechRecognition({
      lang: "en-IN",
      maxSessionMs: VOICE_LONG_FORM_MAX_SESSION_MS,
      silenceMs: VOICE_LONG_FORM_SILENCE_MS,
      onTranscript: ({ transcript: tr }) => appendTranscript(tr),
    });

  const onFinalReview = () => {
    void runOrganize("final", transcript);
  };

  const flushDirectLines = () => {
    const lines = directTranscript
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (lines.length === 0) return;
    appendCapturedBatch(
      lines.map((title) => ({
        title: title.slice(0, 500),
        syllabus_master_id: null,
        group_label: null,
      })),
    );
    setDirectTranscript("");
  };

  const continueToSetTimes = () => {
    if (items.length === 0) return;
    setTimeIdx(0);
    setPhase("time");
  };

  const itemsWithMinutesForServer = useCallback((): OrganizedBacklogItemInput[] => {
    return items.map((it, i) => {
      const base = itemMeta[i] ?? {
        title: it.title,
        details: "",
        syllabus_master_id: it.syllabus_master_id,
        group_label: it.group_label,
      };
      return {
        ...base,
        title: it.title,
        syllabus_master_id: it.syllabus_master_id,
        group_label: it.group_label,
        effort_estimate_minutes: minutesList[i] ?? 60,
      };
    });
  }, [items, itemMeta, minutesList]);

  const runPreview = useCallback(
    async (levelOverride?: BacklogScheduleIntensity) => {
      const level = levelOverride ?? intensity;
      const payload = itemsWithMinutesForServer();
      if (payload.some((p) => (p.effort_estimate_minutes ?? 0) < BACKLOG_TIME_MIN_CAP)) {
        setLiveError("Set at least 15 minutes per task.");
        return;
      }
      setBusy("preview");
      setLiveError(null);
      try {
        const res = await previewBacklogSchedule(payload, today, userLocalHour, level);
        if (!res.ok) {
          setLiveError(res.error);
          return;
        }
        setPreviewHeadline(res.headline);
        setPreviewRows(res.rows);
        setPreviewPerDay(res.perDay);
        setPhase("preview");
      } finally {
        setBusy(null);
      }
    },
    [itemsWithMinutesForServer, today, userLocalHour, intensity],
  );

  const onTimeNext = () => {
    if (timeIdx < items.length - 1) {
      setTimeIdx((k) => k + 1);
    } else {
      void runPreview();
    }
  };

  const onTimeBack = () => {
    if (timeIdx > 0) setTimeIdx((k) => k - 1);
    else setPhase("vent");
  };

  const setMinuteAt = (idx: number, delta: number) => {
    setMinutesList((prev) => {
      const next = [...prev];
      const cur = next[idx] ?? 60;
      next[idx] = clampMinutes(cur + delta);
      return next;
    });
  };

  const onCommit = async () => {
    const payload = itemsWithMinutesForServer();
    setBusy("commit");
    setLiveError(null);
    try {
      const res = await commitBacklogSchedule(payload, today, userLocalHour, intensity, {
        ventRawText:
          [transcript.trim(), directTranscript.trim()].filter(Boolean).join("\n\n") || null,
      });
      if (!res.ok) {
        setLiveError(res.error);
        return;
      }
      trackMetaBacklogPlanLocked();
      setTranscript("");
      setDirectTranscript("");
      setItems([]);
      setMinutesList([]);
      setItemMeta([]);
      setChips([]);
      setPreviewHeadline(null);
      setPreviewRows([]);
      setPhase("vent");
      setTimeIdx(0);
    } finally {
      setBusy(null);
    }
  };

  const curMinutes = minutesList[timeIdx] ?? 60;
  const curItem = items[timeIdx];

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-20">
      <header className="space-y-1">
        <p className="kal-category-label text-kal-accent">Backlog Tracker</p>
        <h1 className="kal-feature-title">Clear what’s pending</h1>
        <p className="text-sm text-kal-muted">
          Use <strong className="text-kal-text">AI split</strong> for messy brain dumps, or{" "}
          <strong className="text-kal-text">exact lines</strong> when every word matters. Then you
          choose how long each piece gets.
        </p>
      </header>

      {phase === "vent" ? (
        <div className="space-y-6">
          <section className="space-y-3 rounded-2xl border border-kal-border bg-kal-card p-4 kal-shadow-card">
            <label className="block text-xs font-semibold uppercase tracking-wide text-kal-muted">
              Brain dump — AI splits into tasks
            </label>
            <p className="text-[11px] leading-snug text-kal-muted">
              Speak or type loosely. We&apos;ll group by subject and match syllabus when it makes
              sense — wording may change.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={5}
              className="w-full resize-y rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent focus:outline-none focus:ring-2 focus:ring-kal-accent/25"
              placeholder="e.g. Organic chem is a mess, mock 3 analysis, electrostatics diagrams…"
            />

            <div className="flex flex-wrap gap-2">
              <AiFeatureGate>
                <button
                  type="button"
                  onClick={() => (isListening ? stopListening() : startListening())}
                  disabled={!isSupported}
                  className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-accent px-4 py-2 text-sm font-semibold text-kal-accent-foreground disabled:opacity-50"
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4" aria-hidden />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" aria-hidden />
                      Speak
                    </>
                  )}
                </button>
              </AiFeatureGate>
              <button
                type="button"
                onClick={onFinalReview}
                disabled={busy !== null || transcript.trim().length < 4}
                className="rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2 text-sm font-semibold text-kal-text disabled:opacity-50"
              >
                Split with AI
              </button>
            </div>
            {!isSupported ? (
              <p className="text-xs text-kal-muted">
                Voice isn&apos;t supported in this browser — type instead.
              </p>
            ) : null}
            {recError ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">{recError}</p>
            ) : null}
            {chips.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-kal-border/80 bg-kal-card-muted px-2.5 py-1 text-[11px] text-kal-muted"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
            {busy === "partial" ? (
              <p className="text-[11px] text-kal-muted" aria-live="polite">
                Organizing…
              </p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-2xl border border-kal-border bg-kal-card p-4 kal-shadow-card">
            <label className="block text-xs font-semibold uppercase tracking-wide text-kal-muted">
              Exact lines — no AI
            </label>
            <p className="text-[11px] leading-snug text-kal-muted">
              One backlog item per line. Text is kept <strong className="text-kal-text">exactly</strong>{" "}
              as you type (e.g. &quot;chemistry chapter 2 class notes&quot;).
            </p>
            <textarea
              value={directTranscript}
              onChange={(e) => setDirectTranscript(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent focus:outline-none focus:ring-2 focus:ring-kal-accent/25"
              placeholder={"chemistry chapter 2 class notes\nmock 3 — essay outline"}
            />
            <button
              type="button"
              onClick={flushDirectLines}
              disabled={busy !== null || !directTranscript.trim()}
              className="rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2 text-sm font-semibold text-kal-text disabled:opacity-50"
            >
              Add lines to list
            </button>
          </section>

          {items.length > 0 ? (
            <section className="space-y-3 rounded-2xl border border-kal-border/90 bg-kal-card-muted/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-kal-text">
                  Captured ({items.length})
                </p>
                <span className="text-[11px] text-kal-muted">AI + exact</span>
              </div>
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {items.map((it, i) => (
                  <li
                    key={`${it.title}-${i}`}
                    className="flex items-start justify-between gap-2 rounded-lg border border-kal-border/60 bg-kal-card px-2.5 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{it.title}</p>
                      {it.group_label ? (
                        <p className="text-[10px] text-kal-muted">{it.group_label}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCapturedItem(i)}
                      className="shrink-0 text-[11px] font-semibold text-kal-muted hover:text-rose-600 dark:hover:text-rose-300"
                      aria-label={`Remove ${it.title}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={continueToSetTimes}
                className="w-full rounded-xl bg-kal-accent py-3 text-sm font-bold text-kal-accent-foreground"
              >
                Set time for each · {items.length} item{items.length === 1 ? "" : "s"}
              </button>
            </section>
          ) : null}
        </div>
      ) : null}

      {phase === "time" && curItem ? (
        <section className="space-y-4 rounded-2xl border border-kal-border bg-kal-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-kal-muted">
              {timeIdx + 1} of {items.length}
            </p>
            <p className="text-[11px] text-kal-muted">How much time will you give this?</p>
          </div>
          <div>
            <p className="text-base font-semibold text-kal-text">{curItem.title}</p>
            {curItem.group_label ? (
              <p className="text-xs text-kal-muted">{curItem.group_label}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              className="rounded-xl border border-kal-border px-4 py-2 text-lg font-bold"
              onClick={() => setMinuteAt(timeIdx, -BACKLOG_TIME_STEP_MINUTES)}
              aria-label="Decrease minutes"
            >
              −
            </button>
            <span className="min-w-[5rem] text-center text-xl font-bold tabular-nums">
              {curMinutes} min
            </span>
            <button
              type="button"
              className="rounded-xl border border-kal-border px-4 py-2 text-lg font-bold"
              onClick={() => setMinuteAt(timeIdx, BACKLOG_TIME_STEP_MINUTES)}
              aria-label="Increase minutes"
            >
              +
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onTimeBack}
              className="flex-1 rounded-xl border border-kal-border bg-kal-card-muted py-2 text-sm font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onTimeNext}
              disabled={busy !== null}
              className="flex-1 rounded-xl bg-kal-accent py-2 text-sm font-bold text-kal-accent-foreground disabled:opacity-50"
            >
              {timeIdx < items.length - 1 ? "Next" : "Preview plan"}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "preview" ? (
        <section className="space-y-4 rounded-2xl border border-kal-border bg-kal-card p-4">
          <h2 className="text-sm font-bold text-kal-text">Your plan</h2>
          {previewHeadline ? (
            <p className="text-sm font-medium text-kal-accent">{previewHeadline}</p>
          ) : null}
          <p className="text-xs text-kal-muted">
            Up to {previewPerDay} recovery tasks per day — we balance subjects when we can.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                intensity === "lighter"
                  ? "border-kal-accent bg-kal-accent/15 text-kal-accent"
                  : "border-kal-border text-kal-muted"
              }`}
              onClick={() => {
                setIntensity("lighter");
                void runPreview("lighter");
              }}
            >
              Lighter
            </button>
            <button
              type="button"
              disabled={busy !== null}
              className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                intensity === "heavier"
                  ? "border-kal-accent bg-kal-accent/15 text-kal-accent"
                  : "border-kal-border text-kal-muted"
              }`}
              onClick={() => {
                setIntensity("heavier");
                void runPreview("heavier");
              }}
            >
              Heavier
            </button>
          </div>

          <ul className="space-y-2">
            {previewRows.map((r, i) => (
              <li
                key={`${r.plan_date}-${r.title}-${i}`}
                className="flex items-start justify-between gap-2 rounded-lg border border-kal-border/70 bg-kal-card-muted/50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-[11px] text-kal-muted">
                    {r.plan_date} · {r.estimated_minutes}m
                    {r.group_label ? ` · ${r.group_label}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void onCommit()}
              disabled={busy !== null || previewRows.length === 0}
              className="w-full rounded-xl bg-kal-accent py-3 text-sm font-bold text-kal-accent-foreground disabled:opacity-50"
            >
              {busy === "commit" ? "Saving…" : "Start fixing this"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("time");
                setTimeIdx(items.length - 1);
              }}
              className="text-center text-xs font-semibold text-kal-muted hover:text-kal-accent"
            >
              Edit times
            </button>
          </div>
        </section>
      ) : null}

      {liveError ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          {liveError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/backlog-list" className="font-semibold text-kal-accent hover:underline">
          Backlog List
        </Link>
        <Link
          href="/daily-plan"
          className="font-semibold text-kal-muted hover:text-kal-accent hover:underline"
        >
          Daily Plan
        </Link>
      </div>
    </div>
  );
}
