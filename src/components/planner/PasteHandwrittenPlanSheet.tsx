"use client";

import { ClipboardList, Loader2, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  listHandwrittenPlannerForDate,
  type HandwrittenPlannerRow,
} from "@/actions/handwrittenPlanner";
import {
  parsePastedHandwrittenPlan,
  type ParsedPastedPlanTask,
} from "@/actions/pasteHandwrittenPlan";
import {
  persistHandwrittenSnapshotLocal,
  pushHandwrittenPlannerReplaceToOutbox,
} from "@/lib/handwrittenPlannerSync";
import { flushOutbox } from "@/lib/sync";
import { getHandwrittenPlannerSnapshot } from "@/lib/taskIdb";
import { dbTimeToInputValue, inputTimeToDb } from "@/lib/taskTime";
import { useAuthStore } from "@/store/useAuthStore";

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
    include: true,
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

type Props = {
  open: boolean;
  onClose: () => void;
  assignedDate: string;
  onSaved: () => void;
  onError: (message: string) => void;
};

export function PasteHandwrittenPlanSheet({
  open,
  onClose,
  assignedDate,
  onSaved,
  onError,
}: Props) {
  const baseId = useId();
  const userId = useAuthStore((s) => s.user?.id);
  const [phase, setPhase] = useState<"idle" | "parse" | "save">("idle");
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const rawTextRef = useRef(rawText);
  rawTextRef.current = rawText;
  /** Matches last load or successful outbox enqueue — skips redundant work. */
  const autosaveSigRef = useRef("");
  const [hint, setHint] = useState<string | null>(null);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const applyServerEntries = useCallback((entries: HandwrittenPlannerRow[]) => {
    const rt = entries[0]?.source_text?.trim() ?? "";
    const mapped = entries.map(serverRowToEditable);
    setRawText(rt);
    setRows(mapped);
    autosaveSigRef.current = handwrittenAutosaveSig(rt, mapped);
  }, []);

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setRawText("");
      setRows([]);
      setHint(null);
      setAutosaveError(null);
      setHydrated(false);
      autosaveSigRef.current = "";
      return;
    }

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

      const res = await listHandwrittenPlannerForDate(assignedDate);
      if (cancelled) return;

      if (res.ok && res.entries.length > 0) {
        const rt = res.entries[0]?.source_text?.trim() ?? "";
        const mapped = res.entries.map(serverRowToEditable);
        setRawText(rt);
        setRows(mapped);
        autosaveSigRef.current = handwrittenAutosaveSig(rt, mapped);
        await persistHandwrittenSnapshotLocal(uid, assignedDate, rt, mapped);
      } else if (res.ok) {
        const snap = await getHandwrittenPlannerSnapshot(uid, assignedDate);
        if (cancelled) return;
        if (
          snap &&
          snap.userId === uid &&
          snap.logDate === assignedDate &&
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
            assignedDate,
            snap.sourceText,
            snap.rows,
          );
        } else {
          const first = emptyRow();
          setRawText("");
          setRows([first]);
          autosaveSigRef.current = handwrittenAutosaveSig("", [first]);
          await persistHandwrittenSnapshotLocal(uid, assignedDate, "", [first]);
        }
      } else {
        const snap = await getHandwrittenPlannerSnapshot(uid, assignedDate);
        if (cancelled) return;
        if (snap && snap.userId === uid && snap.logDate === assignedDate) {
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
            assignedDate,
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
  }, [open, assignedDate, userId]);

  /**
   * Handwritten-only: `handwritten_planner_snapshots` in IDB + `handwritten_planner_replace` outbox.
   * Does not touch `tasks` or voice timeline.
   */
  useEffect(() => {
    if (!open || !hydrated || !userId) return;
    const uid = userId;
    const sig = handwrittenAutosaveSig(rawTextRef.current, rowsRef.current);
    if (sig === autosaveSigRef.current) return;

    const idbT = setTimeout(() => {
      void persistHandwrittenSnapshotLocal(
        uid,
        assignedDate,
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
            logDate: assignedDate,
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
  }, [open, hydrated, assignedDate, userId, rows, rawText]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const onSynced = () => {
      void (async () => {
        const uid = useAuthStore.getState().user?.id;
        if (!uid) return;
        const res = await listHandwrittenPlannerForDate(assignedDate);
        if (res.ok && res.entries.length > 0) {
          applyServerEntries(res.entries);
        }
      })();
    };
    window.addEventListener("kalnehi-handwritten-planner-synced", onSynced);
    return () =>
      window.removeEventListener("kalnehi-handwritten-planner-synced", onSynced);
  }, [open, assignedDate, applyServerEntries]);

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
      setHint(null);
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Could not process pasted text.");
      setRows([emptyRow()]);
    } finally {
      setPhase("idle");
    }
  }, [rawText]);

  const saveAll = useCallback(async () => {
    const latestRows = rowsRef.current;
    const rt = rawTextRef.current;
    const tasks = buildSaveTasks(latestRows);
    if (tasks.length === 0) {
      onError("Tick at least one row with a task name.");
      return;
    }
    const uid = userId;
    if (!uid) {
      onError("Sign in to save.");
      return;
    }
    setPhase("save");
    try {
      await persistHandwrittenSnapshotLocal(uid, assignedDate, rt, latestRows);
      await pushHandwrittenPlannerReplaceToOutbox({
        userId: uid,
        logDate: assignedDate,
        sourceText: rt,
        tasks,
      });
      await flushOutbox(uid);
      const res = await listHandwrittenPlannerForDate(assignedDate);
      if (!res.ok) {
        onError(res.error);
        setPhase("idle");
        return;
      }
      if (res.entries.length > 0) {
        applyServerEntries(res.entries);
      }
      onSaved();
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setPhase("idle");
    }
  }, [assignedDate, userId, onError, onSaved, onClose, applyServerEntries]);

  if (!open) return null;
  const busy = phase !== "idle";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        className="relative z-10 max-h-[min(94vh,52rem)] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl sm:rounded-2xl sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-zinc-700 pb-3">
          <div>
            <h2 id={`${baseId}-title`} className="text-lg font-semibold text-white">
              Paste Handwritten Daily Plan
            </h2>
            <p className="mt-1 text-xs text-zinc-400">{assignedDate}</p>
            {autosaveError ? (
              <p className="mt-1 text-[10px] text-amber-400/90">{autosaveError}</p>
            ) : (
              <p className="mt-1 text-[10px] text-zinc-500">
                Handwritten planner only: saves on this device and queues sync
                (debounced).
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950/40 p-3 text-sm text-zinc-200">
          <p className="mb-2 inline-flex items-center gap-2 font-semibold text-zinc-100">
            <ClipboardList className="h-4 w-4 text-emerald-300" />
            Steps
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-300">
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
            className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-50"
          />
        </div>

        <button
          type="button"
          onClick={() => void processWithAi()}
          disabled={busy || !hydrated}
          className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 disabled:opacity-40"
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
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
            {hint}
          </p>
        ) : null}

        {!hydrated ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </p>
        ) : null}

        {hydrated && rows.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-zinc-500">Parsed tasks</p>
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[2rem_1fr_2fr_auto_auto] items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-950/80 p-3"
                >
                  <label className="mt-2 flex cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={() => updateRow(r.id, { include: !r.include })}
                      className="h-5 w-5 rounded border-zinc-600"
                      title="Include when saving"
                    />
                  </label>
                  <input
                    type="time"
                    value={r.startInput}
                    onChange={(e) => updateRow(r.id, { startInput: e.target.value })}
                    disabled={!r.include}
                    className="min-h-[40px] rounded border border-zinc-600 bg-zinc-900 px-2 text-sm text-white disabled:opacity-50"
                    aria-label="From time"
                  />
                  <input
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    placeholder="Task name"
                    disabled={!r.include}
                    className="min-h-[40px] rounded border border-zinc-600 bg-zinc-900 px-2 text-sm text-white placeholder:text-zinc-600 disabled:opacity-50"
                    aria-label="Task name"
                  />
                  <input
                    type="time"
                    value={r.endInput}
                    onChange={(e) => updateRow(r.id, { endInput: e.target.value })}
                    disabled={!r.include}
                    className="min-h-[40px] w-[7.25rem] rounded border border-zinc-600 bg-zinc-900 px-2 text-sm text-white disabled:opacity-50"
                    aria-label="To time"
                  />
                  <div className="flex items-center gap-2">
                    <span className="w-[3.5rem] text-right text-xs font-medium text-zinc-400">
                      {r.duration ?? "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(r.id)}
                      className="rounded border border-zinc-600 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-rose-300"
                      aria-label="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addRow}
              disabled={busy}
              className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600 text-sm text-zinc-300 hover:bg-zinc-800/50 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add another row
            </button>
          </div>
        ) : null}

        <div className="mt-5 border-t border-zinc-700 pt-4">
          <button
            type="button"
            disabled={busy || rows.length === 0 || !hydrated}
            onClick={() => void saveAll()}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-zinc-900 disabled:opacity-40"
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
      </div>
    </div>
  );
}
