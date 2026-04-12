"use client";

import { Camera, ClipboardList, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { insertDailyTask } from "@/actions/dailyPlan";
import {
  parseHandwrittenPlannerPhoto,
  type ParsedPastedPlanTask,
} from "@/actions/pasteHandwrittenPlan";
import {
  DailyPlanPreviewStaging,
  type DailyPlanPreviewRow,
} from "@/components/planner/DailyPlanPreviewStaging";
import { UnifiedDailyPlanList } from "@/components/planner/UnifiedDailyPlanList";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { slotFromStartEnd } from "@/lib/dailyPlanTime";
import { compressImageForUpload } from "@/lib/plannerPhotoClient";
import { dbTimeToInputValue } from "@/lib/taskTime";
import { minutesBetweenHHMM } from "@/lib/voiceIst";
import { useAuthStore } from "@/store/useAuthStore";

type EditableRow = DailyPlanPreviewRow;

function emptyRow(): EditableRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    startInput: "",
    endInput: "",
    duration: null,
  };
}

function toRows(tasks: ParsedPastedPlanTask[]): EditableRow[] {
  return tasks.map((t) => ({
    id: crypto.randomUUID(),
    name: t.name,
    startInput: dbTimeToInputValue(t.start_time ? `${t.start_time}:00` : null),
    endInput: dbTimeToInputValue(t.end_time ? `${t.end_time}:00` : null),
    duration: t.duration ?? null,
  }));
}

function buildSaveTasks(rows: EditableRow[]) {
  return rows
    .filter((r) => r.name.trim().length > 0 && r.excludeFromCommit !== true)
    .map((r) => ({
      activityName: r.name.trim(),
      start_input: r.startInput,
      end_input: r.endInput,
      source_raw_slice: r.name.trim(),
    }));
}

function scrollStagingIntoView(): void {
  window.setTimeout(() => {
    document
      .getElementById("handwritten-staging")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

function scrollLivePlanIntoView(): void {
  window.setTimeout(() => {
    document
      .getElementById("handwritten-live-plan")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 200);
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
  const [hint, setHint] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [planListKey, setPlanListKey] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const first = emptyRow();
    setRows([first]);
    setHydrated(true);
  }, [logDate, userId]);

  const updateRow = useCallback((id: string, patch: Partial<EditableRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if ("startInput" in patch || "endInput" in patch) {
          const mins = minutesBetweenHHMM(
            next.startInput || null,
            next.endInput || null,
          );
          next.duration = mins != null ? `${mins}m` : null;
        }
        return next;
      }),
    );
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const commitParsedTasks = useCallback(
    (tasks: ParsedPastedPlanTask[], options?: { sourceText?: string }) => {
      if (options?.sourceText !== undefined) {
        setRawText(options.sourceText);
      }
      const next = toRows(tasks);
      setRows(next.length > 0 ? next : [emptyRow()]);
      if (next.length > 0) {
        scrollStagingIntoView();
      }
    },
    [],
  );

  const onPlannerPhotoSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !userId || !hydrated) return;

      setPhase("parse");
      setHint(null);
      setFormError(null);
      try {
        const { base64, mimeType } = await compressImageForUpload(file);
        const res = await parseHandwrittenPlannerPhoto({
          imageBase64: base64,
          mimeType,
          logDate,
        });
        if (!res.ok) {
          setHint(res.error);
          return;
        }
        const sourceText = `Photo scan · ${new Date().toISOString().slice(0, 16)}`;
        commitParsedTasks(res.tasks, { sourceText });
      } catch (err) {
        setHint(err instanceof Error ? err.message : "Could not scan that photo.");
      } finally {
        setPhase("idle");
      }
    },
    [userId, hydrated, logDate, commitParsedTasks],
  );

  const addCheckedToPlan = useCallback(async () => {
    setFormError(null);
    setSaveOk(false);
    const latestRows = rowsRef.current;
    const rt = rawTextRef.current.trim().slice(0, 12_000);
    const tasks = buildSaveTasks(latestRows);
    if (tasks.length === 0) {
      setFormError(
        "Add at least one task with a name in the preview box above, then tap Add again.",
      );
      return;
    }
    if (!userId) {
      setFormError("Sign in to save.");
      return;
    }
    setPhase("save");
    try {
      for (const t of tasks) {
        const { time_slot, time_start, time_end } = slotFromStartEnd(
          t.start_input,
          t.end_input,
        );
        const id = crypto.randomUUID();
        const res = await insertDailyTask({
          plan_date: logDate,
          id,
          title: t.activityName,
          time_slot,
          time_start,
          time_end,
          source: "handwritten",
          source_raw_text: rt || t.source_raw_slice,
        });
        if (!res.ok) {
          setFormError(res.error);
          setPhase("idle");
          return;
        }
      }
      window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
      setPlanListKey((k) => k + 1);
      setSaveOk(true);
      window.setTimeout(() => setSaveOk(false), 4000);
      setRows([emptyRow()]);
      scrollLivePlanIntoView();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setPhase("idle");
    }
  }, [logDate, userId]);

  const busy = phase !== "idle";

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <h1
          id={`${baseId}-title`}
          className="flex flex-wrap items-center gap-2 text-xl font-bold text-kal-text sm:text-2xl"
        >
          <ClipboardList className="h-7 w-7 shrink-0 text-kal-accent sm:h-8 sm:w-8" aria-hidden />
          Handwritten Daily Plan
        </h1>
        {userId ? (
          <label className="w-full shrink-0 text-[11px] font-medium text-kal-muted sm:max-w-[11.5rem]">
            Date
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="mt-1 block h-10 w-full rounded-lg border border-kal-border bg-kal-input-bg px-2.5 text-sm leading-none text-kal-text"
            />
          </label>
        ) : null}
      </header>

      {!userId ? (
        <p className="rounded-[1rem] border border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] px-4 py-3 text-sm text-[var(--kal-warn-text)]">
          Sign in to scan and save your plan.
        </p>
      ) : null}

      {!userId ? null : (
        <>
          <section className="kal-glass-panel rounded-xl p-3 sm:p-4">
            {formError ? (
              <p
                className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/25 dark:text-rose-100"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
            {saveOk ? (
              <p className="mb-2 text-xs font-medium text-kal-accent" role="status">
                Added to your unified plan.
              </p>
            ) : null}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => void onPlannerPhotoSelected(e)}
            />

            <div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={busy || !hydrated}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border-2 border-kal-accent bg-kal-accent-soft px-3 py-2 text-sm font-semibold text-kal-text shadow-sm transition-colors hover:bg-kal-accent hover:text-white disabled:opacity-40"
              >
                {phase === "parse" ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Scan handwritten list</span>
                  </>
                )}
              </button>
            </div>

            <details className="kal-glass-subtle mt-2 rounded-lg text-xs text-kal-muted">
              <summary className="cursor-pointer select-none px-2.5 py-2 font-medium text-kal-text-secondary">
                Tips for scanning
              </summary>
              <div className="space-y-1.5 border-t border-kal-border px-2.5 pb-2.5 pt-2">
                <p className="leading-snug text-kal-muted">
                  One task per line; put the time range first, then the task. Dark ink on plain paper works best.
                </p>
                <div className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 font-mono text-[11px] leading-[1.6] text-kal-text">
                  6:00–7:30 &nbsp; Physics<br />
                  9:00 am–12:00 pm &nbsp; Math
                </div>
              </div>
            </details>

            {hint ? (
              <p className="mt-2 rounded-lg border border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] px-2.5 py-1.5 text-xs text-[var(--kal-warn-text)]">
                {hint}
              </p>
            ) : null}

            {!hydrated ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-kal-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </p>
            ) : null}

            {hydrated ? (
              <DailyPlanPreviewStaging
                sectionId="handwritten-staging"
                title="Preview"
                subtitle="Edit if needed, then add below."
                compact
                rows={rows}
                onUpdateRow={updateRow}
                onRemoveRow={removeRow}
                onAddEmptyRow={addRow}
                disabled={busy}
              />
            ) : null}

            <div className="mt-3 border-t border-kal-border pt-3">
              <button
                type="button"
                disabled={
                  busy ||
                  !hydrated ||
                  !rows.some((r) => r.name.trim().length > 0)
                }
                onClick={() => void addCheckedToPlan()}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-kal-accent px-4 text-sm font-semibold text-white shadow-sm hover:bg-kal-accent-hover disabled:opacity-40"
              >
                {phase === "save" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  "Add to Today's Plan"
                )}
              </button>
            </div>
          </section>

          <div id="handwritten-live-plan">
            <UnifiedDailyPlanList
              key={planListKey}
              planDate={logDate}
              title="Today's plan"
            />
          </div>
        </>
      )}
    </div>
  );
}
