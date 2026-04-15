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
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <h1
          id={`${baseId}-title`}
          className="kal-feature-title min-w-0 flex flex-wrap items-center gap-2"
        >
          <ClipboardList className="h-7 w-7 shrink-0 text-kal-accent" aria-hidden />
          Handwritten Daily Plan
        </h1>
        {userId ? (
          <label className="block w-full shrink-0 text-left sm:w-[12.5rem] sm:shrink-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-kal-muted">
              Date
            </span>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              aria-label="Plan date"
              className="mt-2 block h-11 w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 text-sm font-medium tabular-nums text-kal-text shadow-sm outline-none transition-colors focus:border-kal-accent/50 focus:ring-2 focus:ring-kal-accent/15"
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
          <section className="kal-glass-panel rounded-xl p-4 sm:p-5">
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

            <div className="mt-1">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={busy || !hydrated}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-kal-accent/85 bg-white/90 px-4 py-2.5 text-sm font-semibold text-kal-text shadow-sm ring-1 ring-kal-accent/10 transition-colors hover:border-kal-accent hover:bg-kal-accent hover:text-white hover:ring-red-900/15 disabled:opacity-40 dark:bg-zinc-900/40 dark:hover:bg-kal-accent"
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

            <div className="kal-glass-subtle mt-4 rounded-lg text-xs text-kal-muted">
              <p className="px-2.5 py-2 font-medium text-kal-text-secondary">
                Tips for scanning
              </p>
              <div className="space-y-1.5 border-t border-kal-border px-2.5 pb-2.5 pt-2">
                <p className="leading-snug text-kal-muted">
                  One task per line: write the time range first, then what you will do. You do not need a fixed style—
                  <span className="whitespace-nowrap">6am–7:30 pm</span>,{" "}
                  <span className="whitespace-nowrap">9:00 am–12:00 pm</span>, or{" "}
                  <span className="whitespace-nowrap">9 am</span> (with or without{" "}
                  <span className="whitespace-nowrap">:00</span>) are all fine. Use{" "}
                  <span className="whitespace-nowrap">am</span>/<span className="whitespace-nowrap">pm</span>{" "}
                  when it helps you read the times. Dark ink on plain paper works best.
                </p>
                <div className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 font-mono text-[11px] leading-[1.6] text-kal-text">
                  6 am–7:30 pm &nbsp;&nbsp; Physics<br />
                  9 am–12:00 pm &nbsp;&nbsp; Math
                </div>
              </div>
            </div>

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
              <div className="mt-5">
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
              </div>
            ) : null}

            <div className="mt-5 border-t border-kal-border pt-4">
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
