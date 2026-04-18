"use client";

import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { insertDailyTask } from "@/actions/dailyPlan";
import {
  DailyPlanPreviewStaging,
  isPreviewRowIncluded,
  type DailyPlanPreviewRow,
} from "@/components/planner/DailyPlanPreviewStaging";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { addToPlanButtonLabel } from "@/lib/dailyPlanUiDate";
import { slotFromStartEnd } from "@/lib/dailyPlanTime";
import type { VoiceDraftTask } from "@/lib/voiceDraftFromGroq";
import { minutesBetweenHHMM } from "@/lib/voiceIst";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";

type ParseResponse =
  | { ok: true; tasks: VoiceDraftTask[] }
  | { ok: false; error: string; openRawFallback?: boolean };

/** Typed NLP is not a live mic session; charge a minimal billable second count vs default 60s. */
const TYPED_NLP_BILLING_SECONDS = 1;

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

function voiceDraftToRow(
  t: VoiceDraftTask,
  sourceRaw: string,
): DailyPlanPreviewRow {
  return {
    id: crypto.randomUUID(),
    name: t.taskTitle,
    startInput: t.start_time ?? "",
    endInput: t.end_time ?? "",
    duration: t.duration,
    sourceRaw,
  };
}

export function DailyPlanTypedQuickAdd({ planDate, onAdded }: Props) {
  const calendarToday = useCalendarDate();
  const addPlanLabel = useMemo(
    () => addToPlanButtonLabel(planDate, calendarToday),
    [planDate, calendarToday],
  );
  const previewSubtitle = useMemo(
    () =>
      `All named rows are added by default. Check the box on a row only to exclude it. Edit title or times if needed, then tap ${addPlanLabel}.`,
    [addPlanLabel],
  );
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [inputText, setInputText] = useState("");
  /** Keeps latest text for Add to preview — avoids stale closure if useCallback deps omit inputText. */
  const inputTextRef = useRef(inputText);
  inputTextRef.current = inputText;
  const [previewRows, setPreviewRows] = useState<DailyPlanPreviewRow[]>(() => [
    emptyPreviewRow(),
  ]);
  const previewRowsRef = useRef(previewRows);
  previewRowsRef.current = previewRows;

  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseHint, setParseHint] = useState<string | null>(null);

  useEffect(() => {
    setPreviewRows([emptyPreviewRow()]);
    setInputText("");
    setError(null);
    setParseHint(null);
  }, [planDate]);

  useEffect(() => {
    const id = requestAnimationFrame(() => areaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const addNaturalLanguageToPreview = useCallback(async () => {
    const raw = inputTextRef.current.trim();
    if (!raw) {
      setError("Type what you want to add.");
      return;
    }
    setError(null);
    setParseHint(null);
    setParsing(true);
    try {
      const parseRes = await fetch("/api/voice-parse-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: raw,
          log_date: planDate,
          occurred_at: new Date().toISOString(),
          durationSeconds: TYPED_NLP_BILLING_SECONDS,
        }),
      });
      const res = (await parseRes.json()) as ParseResponse;

      if (!res.ok) {
        if (parseRes.status === 401) {
          setError("Please sign in to add tasks.");
          return;
        }
        if (parseRes.status === 429) {
          const msg =
            "error" in res && typeof res.error === "string"
              ? res.error
              : "Voice quota exceeded.";
          setError(surfaceErrorForUi(msg));
          return;
        }
        if (res.openRawFallback) {
          setParseHint(
            "Could not auto-parse times — showing your text below; edit the row, then add.",
          );
          const fallbackRow: DailyPlanPreviewRow = {
            id: crypto.randomUUID(),
            name: raw.slice(0, 500),
            startInput: "",
            endInput: "",
            duration: null,
            sourceRaw: raw.slice(0, 12_000),
          };
          setPreviewRows((prev) => {
            const kept = prev.filter(
              (r) => r.name.trim() || r.startInput || r.endInput,
            );
            return [...kept, fallbackRow, emptyPreviewRow()];
          });
        } else {
          setError(surfaceErrorForUi(res.error));
        }
        return;
      }

      const chunk = raw.slice(0, 12_000);
      const newRows = res.tasks.map((t) => voiceDraftToRow(t, chunk));
      setPreviewRows((prev) => {
        const kept = prev.filter(
          (r) => r.name.trim() || r.startInput || r.endInput,
        );
        return [...kept, ...newRows, emptyPreviewRow()];
      });
    } catch {
      setParseHint(
        "Network error — added your text as a single task; edit times if needed.",
      );
      const fallbackRow: DailyPlanPreviewRow = {
        id: crypto.randomUUID(),
        name: raw.slice(0, 500),
        startInput: "",
        endInput: "",
        duration: null,
        sourceRaw: raw.slice(0, 12_000),
      };
      setPreviewRows((prev) => {
        const kept = prev.filter(
          (r) => r.name.trim() || r.startInput || r.endInput,
        );
        return [...kept, fallbackRow, emptyPreviewRow()];
      });
    } finally {
      setParsing(false);
      setInputText("");
    }
  }, [planDate]);

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
    const toSave = previewRowsRef.current.filter(isPreviewRowIncluded);
    if (toSave.length === 0) {
      setError(
        "Add at least one task in the preview, or turn off Exclude on rows you want to save.",
      );
      return;
    }
    setCommitting(true);
    try {
      for (const r of toSave) {
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
          source_raw_text: r.sourceRaw ?? r.name.trim(),
          syllabus_master_id: r.syllabus_master_id ?? null,
        });
        if (!res.ok) {
          setError(surfaceErrorForUi(res.error));
          return;
        }
      }
      setPreviewRows([emptyPreviewRow()]);
      setParseHint(null);
      window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
      onAdded?.();
    } catch (e) {
      setError(surfaceErrorForUi(e));
    } finally {
      setCommitting(false);
    }
  }, [planDate, onAdded]);

  const busy = committing || parsing;

  return (
    <div className="kal-glass-panel rounded-[1.25rem] p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
        Quick add
      </p>
      <p className="mt-1 text-xs leading-relaxed text-kal-muted">
        Describe the task and time in plain English — e.g. &quot;study bio from 6 am to 7
        am&quot;, &quot;revise physics chapter 5 at 9pm&quot;, or &quot;morning run 30
        mins&quot;. We parse it automatically, then you can edit before saving.
      </p>
      <div className="mt-3">
        <label className="block text-[11px] font-medium text-kal-muted">
          Task (natural language)
          <textarea
            ref={areaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            placeholder="e.g. study bio from 6 am to 7 am"
            disabled={busy}
            className="mt-1 w-full resize-y rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent focus:outline-none focus:ring-2 focus:ring-kal-accent/20 disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void addNaturalLanguageToPreview()}
          className="kal-glass-subtle mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-kal-text-secondary shadow-sm hover:opacity-95 disabled:opacity-40 sm:w-auto"
        >
          {parsing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Parsing…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add to preview
            </>
          )}
        </button>
      </div>
      {parseHint ? (
        <p className="mt-2 text-xs text-kal-muted" role="status">
          {parseHint}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-[var(--kal-danger-text)]" role="alert">
          {error}
        </p>
      ) : null}

      <DailyPlanPreviewStaging
        sectionId="typed-plan-staging"
        title="Preview (not saved yet)"
        subtitle={previewSubtitle}
        rows={previewRows}
        onUpdateRow={updatePreviewRow}
        onRemoveRow={removePreviewRow}
        onAddEmptyRow={addEmptyPreviewRow}
        disabled={busy}
        excludeFromSaveHint="Exclude this row from the next save"
      />
      <p className="mt-2 text-[11px] leading-snug text-kal-muted">
        Tip: changing subject or chapter clears the microtopic link until you pick a
        microtopic again.
      </p>

      <div className="mt-2 border-t border-kal-border pt-4">
        <button
          type="button"
          disabled={
            busy ||
            !previewRows.some((r) => isPreviewRowIncluded(r))
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
            addPlanLabel
          )}
        </button>
      </div>
    </div>
  );
}
