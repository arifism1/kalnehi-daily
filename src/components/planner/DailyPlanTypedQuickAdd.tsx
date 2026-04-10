"use client";

import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { insertDailyTask } from "@/actions/dailyPlan";
import {
  DailyPlanPreviewStaging,
  type DailyPlanPreviewRow,
} from "@/components/planner/DailyPlanPreviewStaging";
import { slotFromStartEnd } from "@/lib/dailyPlanTime";
import { dbTimeFromTwelveHour } from "@/lib/taskTime";
import { minutesBetweenHHMM } from "@/lib/voiceIst";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type Props = {
  planDate: string;
  onAdded?: () => void;
};

function emptyPreviewRow(): DailyPlanPreviewRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    startInput: "",
    endInput: "",
    duration: null,
  };
}

export function DailyPlanTypedQuickAdd({ planDate, onAdded }: Props) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  const [hour12, setHour12] = useState<string>("");
  const [minute, setMinute] = useState("0");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [previewRows, setPreviewRows] = useState<DailyPlanPreviewRow[]>(() => [
    emptyPreviewRow(),
  ]);
  const previewRowsRef = useRef(previewRows);
  previewRowsRef.current = previewRows;

  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewRows([emptyPreviewRow()]);
    setTitle("");
    setHour12("");
    setMinute("0");
    setPeriod("AM");
    setError(null);
  }, [planDate]);

  useEffect(() => {
    const id = requestAnimationFrame(() => areaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const startEndFromPickers = useCallback((): {
    start_input: string;
    end_input: string;
  } => {
    if (hour12 === "") return { start_input: "", end_input: "" };
    const h = Number(hour12);
    const m = Number(minute);
    if (!Number.isFinite(h) || !Number.isFinite(m)) {
      return { start_input: "", end_input: "" };
    }
    const start_time = dbTimeFromTwelveHour({
      hour12: h,
      minute: m,
      period,
    });
    const si = start_time ? start_time.slice(0, 5) : "";
    return { start_input: si, end_input: "" };
  }, [hour12, minute, period]);

  const addCurrentToPreview = useCallback(() => {
    const name = title.trim();
    if (!name) {
      setError("Add a task name.");
      return;
    }
    setError(null);
    const { start_input, end_input } = startEndFromPickers();
    const mins = minutesBetweenHHMM(
      start_input || null,
      end_input || null,
    );
    const row: DailyPlanPreviewRow = {
      id: crypto.randomUUID(),
      name,
      startInput: start_input,
      endInput: end_input,
      duration: mins != null ? `${mins}m` : null,
    };
    setPreviewRows((prev) => {
      const kept = prev.filter(
        (r) => r.name.trim() || r.startInput || r.endInput,
      );
      return [...kept, row, emptyPreviewRow()];
    });
    setTitle("");
    setHour12("");
    setMinute("0");
    setPeriod("AM");
  }, [startEndFromPickers, title]);

  const updatePreviewRow = useCallback(
    (id: string, patch: Partial<DailyPlanPreviewRow>) => {
      setPreviewRows((prev) =>
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
    },
    [],
  );

  const removePreviewRow = useCallback((id: string) => {
    setPreviewRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addEmptyPreviewRow = useCallback(() => {
    setPreviewRows((prev) => [...prev, emptyPreviewRow()]);
  }, []);

  const commitPreviewToPlan = useCallback(async () => {
    setError(null);
    const named = previewRowsRef.current.filter((r) => r.name.trim());
    if (named.length === 0) {
      setError(
        "Add at least one task with a name to the preview (use Add to preview), then commit.",
      );
      return;
    }
    setCommitting(true);
    try {
      for (const r of named) {
        const { time_slot, time_start, time_end } = slotFromStartEnd(
          r.startInput,
          r.endInput,
        );
        const res = await insertDailyTask({
          plan_date: planDate,
          id: crypto.randomUUID(),
          title: r.name.trim(),
          time_slot,
          time_start,
          time_end,
          source: "typed",
          source_raw_text: r.name.trim(),
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
      }
      setPreviewRows([emptyPreviewRow()]);
      window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
      onAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setCommitting(false);
    }
  }, [planDate, onAdded]);

  const busy = committing;

  return (
    <div className="rounded-[1.25rem] border border-kal-border bg-kal-card kal-shadow-card p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
        Quick add
      </p>
      <p className="mt-1 text-xs leading-relaxed text-kal-muted">
        Queue tasks in the preview first, then add them all to today&apos;s plan in one
        tap — same flow as dictate and handwritten.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-[11px] font-medium text-kal-muted">
          Task
          <textarea
            ref={areaRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            rows={2}
            placeholder="What are you doing?"
            className="mt-1 w-full resize-y rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <label className="text-[11px] font-medium text-kal-muted">
            Start
            <div className="mt-1 flex gap-1">
              <select
                value={hour12}
                onChange={(e) => setHour12(e.target.value)}
                className="min-h-[44px] rounded-lg border border-kal-border bg-kal-input-bg px-2 text-sm text-kal-text"
              >
                <option value="">—</option>
                {HOURS.map((h) => (
                  <option key={h} value={String(h)}>
                    {h}
                  </option>
                ))}
              </select>
              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="min-h-[44px] rounded-lg border border-kal-border bg-kal-input-bg px-2 text-sm text-kal-text"
              >
                {MINUTES.map((m) => (
                  <option key={m} value={String(m)}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as "AM" | "PM")}
                className="min-h-[44px] rounded-lg border border-kal-border bg-kal-input-bg px-2 text-sm text-kal-text"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => addCurrentToPreview()}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-5 text-sm font-bold text-kal-text-secondary shadow-sm hover:bg-kal-border/30 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add to preview
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-[var(--kal-danger-text)]" role="alert">
          {error}
        </p>
      ) : null}

      <DailyPlanPreviewStaging
        sectionId="typed-plan-staging"
        title="Preview (not saved yet)"
        subtitle="Edit rows if needed, then tap Add to Today's Plan to save them to the live list below."
        rows={previewRows}
        onUpdateRow={updatePreviewRow}
        onRemoveRow={removePreviewRow}
        onAddEmptyRow={addEmptyPreviewRow}
        disabled={busy}
      />

      <div className="mt-2 border-t border-kal-border pt-4">
        <button
          type="button"
          disabled={
            busy ||
            !previewRows.some((r) => r.name.trim().length > 0)
          }
          onClick={() => void commitPreviewToPlan()}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-6 text-base font-semibold text-white shadow-sm hover:bg-kal-accent-hover disabled:opacity-40"
        >
          {committing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Adding…
            </>
          ) : (
            "Add to Today's Plan"
          )}
        </button>
      </div>
    </div>
  );
}
