"use client";

import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  listHandwrittenPlannerForDate,
  type HandwrittenPlannerRow,
} from "@/actions/handwrittenPlanner";
import {
  parsePastedHandwrittenPlan,
  type ParsedPastedPlanTask,
} from "@/actions/pasteHandwrittenPlan";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import {
  persistHandwrittenSnapshotLocal,
  pushHandwrittenPlannerReplaceToOutbox,
} from "@/lib/handwrittenPlannerSync";
import { applyOptimisticTaskCreate } from "@/lib/taskMutations";
import { flushOutbox } from "@/lib/sync";
import { getHandwrittenPlannerSnapshot } from "@/lib/taskIdb";
import { dbTimeToInputValue, inputTimeToDb } from "@/lib/taskTime";
import { minutesBetweenHHMM } from "@/lib/voiceIst";
import { useAuthStore } from "@/store/useAuthStore";
import type { Task } from "@/store/useTaskStore";

type EditableRow = {
  id: string;
  include: boolean;
  name: string;
  startInput: string;
  endInput: string;
  duration: string | null;
};

function parsedInclude(pj: Record<string, unknown> | null): boolean {
  if (!pj) return true;
  return pj.planner_include !== false;
}

function serverRowToEditable(e: HandwrittenPlannerRow): EditableRow {
  const pj =
    e.parsed_json && typeof e.parsed_json === "object"
      ? (e.parsed_json as Record<string, unknown>)
      : null;
  const st = e.start_time ? String(e.start_time).slice(0, 5) : "";
  const et = e.end_time ? String(e.end_time).slice(0, 5) : "";
  return {
    id: e.id,
    include: parsedInclude(pj),
    name: e.title?.trim() ?? "",
    startInput: st,
    endInput: et,
    duration: e.duration?.trim() || null,
  };
}

function emptyRow(): EditableRow {
  return {
    id: crypto.randomUUID(),
    include: true,
    name: "",
    startInput: "",
    endInput: "",
    duration: null,
  };
}

function toRows(tasks: ParsedPastedPlanTask[]): EditableRow[] {
  return tasks.map((t) => ({
    id: crypto.randomUUID(),
    include: false,
    name: t.name,
    startInput: dbTimeToInputValue(t.start_time ? `${t.start_time}:00` : null),
    endInput: dbTimeToInputValue(t.end_time ? `${t.end_time}:00` : null),
    duration: t.duration ?? null,
  }));
}

const PERSIST_LOCAL_MS = 80;
const PUSH_OUTBOX_MS = 320;

function buildSaveTasks(rows: EditableRow[]) {
  return rows
    .filter((r) => r.include && r.name.trim().length > 0)
    .map((r) => ({
      activityName: r.name.trim(),
      start_time: inputTimeToDb(r.startInput),
      end_time: inputTimeToDb(r.endInput),
      duration: r.duration ?? null,
    }));
}

function handwrittenAutosaveSig(raw: string, rows: EditableRow[]): string {
  return JSON.stringify({
    raw: raw.trim(),
    rows: rows.map((r) => ({
      id: r.id,
      include: r.include,
      name: r.name,
      s: r.startInput,
      e: r.endInput,
      d: r.duration,
    })),
  });
}

export function PasteHandwrittenPlanPage() {
  const baseId = useId();
  const today = useCalendarDate();
  const [logDate, setLogDate] = useState(today);
  const userId = useAuthStore((s) => s.user?.id);
  const [phase, setPhase] = useState<"idle" | "parse" | "save">("idle");
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const rawTextRef = useRef(rawText);
  rawTextRef.current = rawText;
  const autosaveSigRef = useRef("");
  const [hint, setHint] = useState<string | null>(null);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const applyServerEntries = useCallback((entries: HandwrittenPlannerRow[]) => {
    const rt = entries[0]?.source_text?.trim() ?? "";
    const mapped = entries.map(serverRowToEditable);
    setRawText(rt);
    setRows(mapped);
    autosaveSigRef.current = handwrittenAutosaveSig(rt, mapped);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    void (async () => {
      const uid = userId;
      if (!uid) {
        if (cancelled) return;
        const first = emptyRow();
        setRawText("");
        setRows([first]);
        autosaveSigRef.current = handwrittenAutosaveSig("", [first]);
        setHydrated(true);
        return;
      }

      const res = await listHandwrittenPlannerForDate(logDate);
      if (cancelled) return;

      if (res.ok && res.entries.length > 0) {
        const rt = res.entries[0]?.source_text?.trim() ?? "";
        const mapped = res.entries.map(serverRowToEditable);
        setRawText(rt);
        setRows(mapped);
        autosaveSigRef.current = handwrittenAutosaveSig(rt, mapped);
        await persistHandwrittenSnapshotLocal(uid, logDate, rt, mapped);
      } else if (res.ok) {
        const snap = await getHandwrittenPlannerSnapshot(uid, logDate);
        if (cancelled) return;
        if (
          snap &&
          snap.userId === uid &&
          snap.logDate === logDate &&
          snap.rows.length > 0
        ) {
          setRawText(snap.sourceText);
          setRows(snap.rows);
          autosaveSigRef.current = handwrittenAutosaveSig(
            snap.sourceText,
            snap.rows,
          );
          await persistHandwrittenSnapshotLocal(
            uid,
            logDate,
            snap.sourceText,
            snap.rows,
          );
        } else {
          const first = emptyRow();
          setRawText("");
          setRows([first]);
          autosaveSigRef.current = handwrittenAutosaveSig("", [first]);
          await persistHandwrittenSnapshotLocal(uid, logDate, "", [first]);
        }
      } else {
        const snap = await getHandwrittenPlannerSnapshot(uid, logDate);
        if (cancelled) return;
        if (snap && snap.userId === uid && snap.logDate === logDate) {
          const displayRows =
            snap.rows.length > 0 ? snap.rows : [emptyRow()];
          setRawText(snap.sourceText);
          setRows(displayRows);
          autosaveSigRef.current = handwrittenAutosaveSig(
            snap.sourceText,
            displayRows,
          );
          await persistHandwrittenSnapshotLocal(
            uid,
            logDate,
            snap.sourceText,
            displayRows,
          );
        } else {
          const first = emptyRow();
          setRawText("");
          setRows([first]);
          autosaveSigRef.current = handwrittenAutosaveSig("", [first]);
        }
      }
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [logDate, userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    const uid = userId;
    const sig = handwrittenAutosaveSig(rawTextRef.current, rowsRef.current);
    if (sig === autosaveSigRef.current) return;

    const idbT = setTimeout(() => {
      void persistHandwrittenSnapshotLocal(
        uid,
        logDate,
        rawTextRef.current,
        rowsRef.current,
      );
    }, PERSIST_LOCAL_MS);

    const syncT = setTimeout(() => {
      void (async () => {
        const sigNow = handwrittenAutosaveSig(
          rawTextRef.current,
          rowsRef.current,
        );
        if (sigNow === autosaveSigRef.current) return;
        try {
          await pushHandwrittenPlannerReplaceToOutbox({
            userId: uid,
            logDate,
            sourceText: rawTextRef.current,
            tasks: buildSaveTasks(rowsRef.current),
          });
          if (
            handwrittenAutosaveSig(rawTextRef.current, rowsRef.current) !==
            sigNow
          ) {
            return;
          }
          setAutosaveError(null);
          autosaveSigRef.current = sigNow;
        } catch {
          setAutosaveError("Could not queue sync.");
        }
      })();
    }, PUSH_OUTBOX_MS);

    return () => {
      clearTimeout(idbT);
      clearTimeout(syncT);
    };
  }, [hydrated, logDate, userId, rows, rawText]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onSynced = () => {
      void (async () => {
        const uid = useAuthStore.getState().user?.id;
        if (!uid) return;
        const res = await listHandwrittenPlannerForDate(logDate);
        if (res.ok && res.entries.length > 0) {
          applyServerEntries(res.entries);
        }
      })();
    };
    window.addEventListener("kalnehi-handwritten-planner-synced", onSynced);
    return () =>
      window.removeEventListener("kalnehi-handwritten-planner-synced", onSynced);
  }, [logDate, applyServerEntries]);

  const updateRow = useCallback((id: string, patch: Partial<EditableRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const processWithAi = useCallback(async () => {
    const text = rawText.trim();
    if (!text) {
      setHint("Paste some transcribed text first.");
      setRows([emptyRow()]);
      return;
    }
    setPhase("parse");
    setHint(null);
    try {
      const res = await parsePastedHandwrittenPlan(text);
      if (!res.ok) {
        setHint(res.error);
        setRows([emptyRow()]);
        setPhase("idle");
        return;
      }
      const next = toRows(res.tasks);
      setRows(next.length > 0 ? next : [emptyRow()]);
      if (userId && next.length > 0) {
        for (const row of next) {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const estimated = minutesBetweenHHMM(
            row.startInput || null,
            row.endInput || null,
          );
          const fullTask: Task = {
            id,
            user_id: userId,
            assigned_date: logDate,
            status: "pending",
            name: row.name?.trim() || null,
            microtopic_id: null,
            created_at: now,
            updated_at: now,
            estimated_minutes: estimated,
            estimated_time_minutes: estimated,
            end_time: inputTimeToDb(row.endInput),
            start_time: inputTimeToDb(row.startInput),
            marks_value: null,
            marks_weight: null,
            time_spent_seconds: null,
            source: "handwritten",
          };
          await applyOptimisticTaskCreate(
            {
              id,
              assigned_date: logDate,
              status: "pending",
              name: row.name?.trim() || null,
              microtopic_id: null,
              start_time: inputTimeToDb(row.startInput),
              end_time: inputTimeToDb(row.endInput),
              estimated_minutes: estimated,
              estimated_time_minutes: estimated,
              source: "handwritten",
            },
            userId,
            fullTask,
          );
        }
      }
      setHint(null);
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Could not process pasted text.");
      setRows([emptyRow()]);
    } finally {
      setPhase("idle");
    }
  }, [rawText, userId, logDate]);

  const saveAll = useCallback(async () => {
    setFormError(null);
    setSaveOk(false);
    const latestRows = rowsRef.current;
    const rt = rawTextRef.current;
    const tasks = buildSaveTasks(latestRows);
    if (tasks.length === 0) {
      setFormError("Tick at least one row with a task name.");
      return;
    }
    const uid = userId;
    if (!uid) {
      setFormError("Sign in to save.");
      return;
    }
    setPhase("save");
    try {
      await persistHandwrittenSnapshotLocal(uid, logDate, rt, latestRows);
      await pushHandwrittenPlannerReplaceToOutbox({
        userId: uid,
        logDate,
        sourceText: rt,
        tasks,
      });
      await flushOutbox(uid);
      const res = await listHandwrittenPlannerForDate(logDate);
      if (!res.ok) {
        setFormError(res.error);
        setPhase("idle");
        return;
      }
      if (res.entries.length > 0) {
        applyServerEntries(res.entries);
      }
      setSaveOk(true);
      window.setTimeout(() => setSaveOk(false), 4000);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setPhase("idle");
    }
  }, [logDate, userId, applyServerEntries]);

  const busy = phase !== "idle";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Pro · Planner
        </p>
        <h1
          id={`${baseId}-title`}
          className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold text-kal-text"
        >
          <ClipboardList className="h-8 w-8 text-kal-accent" aria-hidden />
          Paste Handwritten Daily Plan
        </h1>
        {userId ? (
          <label className="mt-4 block max-w-xs text-xs font-medium text-kal-muted">
            Date
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="mt-1.5 block min-h-[44px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 text-sm text-kal-text"
            />
          </label>
        ) : null}
      </header>

      {!userId ? (
        <p className="rounded-[1rem] border border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] px-4 py-3 text-sm text-[var(--kal-warn-text)]">
          Sign in to use the handwritten planner and sync across devices.
        </p>
      ) : null}

      {!userId ? null : (

      <section className="rounded-[1.25rem] border border-kal-border bg-kal-card kal-shadow-card p-4 sm:p-6">
        {autosaveError ? (
          <p className="mb-3 text-[10px] text-[var(--kal-warn-text)]">{autosaveError}</p>
        ) : null}
        {formError ? (
          <p
            className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/25 dark:text-rose-100"
            role="alert"
          >
            {formError}
          </p>
        ) : null}
        {saveOk ? (
          <p className="mb-3 text-xs font-medium text-kal-accent" role="status">
            Saved and synced.
          </p>
        ) : null}

        <div className="rounded-xl border border-kal-border bg-kal-accent-soft p-3 text-sm text-kal-text-secondary">
          <p className="mb-2 inline-flex items-center gap-2 font-semibold text-kal-text">
            <ClipboardList className="h-4 w-4 text-kal-accent" />
            Steps
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-kal-muted">
            <li>Open ChatGPT, Gemini or any AI chatbot app</li>
            <li>Take photo of your handwritten daily task list</li>
            <li>Ask it to transcribe into clean text with times</li>
            <li>Copy the full text and paste it below</li>
          </ul>
        </div>

        <div className="mt-3">
          <textarea
            rows={12}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={!hydrated}
            placeholder="Paste full transcribed text here..."
            className="w-full resize-y rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted disabled:opacity-50"
          />
        </div>

        <button
          type="button"
          onClick={() => void processWithAi()}
          disabled={busy || !hydrated}
          className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-4 text-sm font-semibold text-white shadow-sm hover:bg-kal-accent-hover disabled:opacity-40"
        >
          {phase === "parse" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            "Process with AI"
          )}
        </button>

        {hint ? (
          <p className="mt-3 rounded-lg border border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] px-3 py-2 text-xs text-[var(--kal-warn-text)]">
            {hint}
          </p>
        ) : null}

        {!hydrated ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-kal-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </p>
        ) : null}

        {hydrated && rows.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-kal-muted">Parsed tasks</p>
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="min-w-0 grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-2 overflow-hidden rounded-lg border border-kal-border bg-kal-card-muted/80 p-3"
                >
                  <label className="mt-2 flex cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={() => updateRow(r.id, { include: !r.include })}
                      className="h-5 w-5 rounded border-kal-border accent-kal-accent"
                      title="Include when saving"
                    />
                  </label>
                  <div className="min-w-0">
                    <textarea
                      value={r.name}
                      onChange={(e) => updateRow(r.id, { name: e.target.value })}
                      placeholder="Task name"
                      rows={1}
                      className="min-h-[40px] min-w-0 w-full resize-y overflow-hidden rounded border border-kal-border bg-kal-input-bg px-2 py-2 text-sm font-semibold leading-5 text-kal-text placeholder:text-kal-muted [overflow-wrap:anywhere]"
                      aria-label="Task name"
                    />
                    <div className="mt-1.5 flex min-w-0 items-center gap-2">
                      <input
                        type="time"
                        value={r.startInput}
                        onChange={(e) =>
                          updateRow(r.id, { startInput: e.target.value })
                        }
                        className="min-h-[32px] rounded border border-kal-border bg-kal-input-bg px-2 text-[11px] text-kal-text"
                        aria-label="From time"
                      />
                      <input
                        type="time"
                        value={r.endInput}
                        onChange={(e) => updateRow(r.id, { endInput: e.target.value })}
                        className="min-h-[32px] rounded border border-kal-border bg-kal-input-bg px-2 text-[11px] text-kal-text"
                        aria-label="To time"
                      />
                      <span className="ml-auto text-xs font-medium text-kal-muted">
                        {r.duration ?? "—"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="mt-1 rounded border border-kal-border p-2 text-kal-muted hover:bg-kal-card-muted hover:text-rose-600 dark:hover:text-rose-300"
                    aria-label="Delete row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addRow}
              disabled={busy}
              className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-lg border border-dashed border-kal-border text-sm text-kal-muted hover:bg-kal-card-muted disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add another row
            </button>
          </div>
        ) : null}

        <div className="mt-5 border-t border-kal-border pt-4">
          <button
            type="button"
            disabled={busy || rows.length === 0 || !hydrated}
            onClick={() => void saveAll()}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-6 text-base font-semibold text-white shadow-sm hover:bg-kal-accent-hover disabled:opacity-40"
          >
            {phase === "save" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save to Handwritten Planner"
            )}
          </button>
        </div>
      </section>
      )}
    </div>
  );
}
