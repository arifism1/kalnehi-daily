"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";

import { formatIstSlotRange12h } from "@/lib/voiceIst";

export type DailyPlanPreviewRow = {
  id: string;
  name: string;
  startInput: string;
  endInput: string;
  duration: string | null;
  /** Optional snippet stored on commit (e.g. voice transcript chunk). */
  sourceRaw?: string;
  /**
   * When true, row is skipped for "Add to Today's Plan". Omitted/false = include named rows.
   */
  excludeFromCommit?: boolean;
};

/** Whether this row should be committed with the bulk "add to plan" action. */
export function isPreviewRowIncluded(r: DailyPlanPreviewRow): boolean {
  return Boolean(r.name.trim()) && r.excludeFromCommit !== true;
}

type Props = {
  sectionId: string;
  title: string;
  subtitle: string;
  rows: DailyPlanPreviewRow[];
  onUpdateRow: (id: string, patch: Partial<DailyPlanPreviewRow>) => void;
  onRemoveRow: (id: string) => void;
  onAddEmptyRow: () => void;
  addAnotherLabel?: string;
  disabled?: boolean;
  /** When true, show a compact loading strip at top of preview (e.g. voice processing). */
  processing?: boolean;
  processingLabel?: string;
};

export function DailyPlanPreviewStaging({
  sectionId,
  title,
  subtitle,
  rows,
  onUpdateRow,
  onRemoveRow,
  onAddEmptyRow,
  addAnotherLabel = "Add another row",
  disabled = false,
  processing = false,
  processingLabel = "Processing…",
}: Props) {
  const showHeader = Boolean(title.trim() || subtitle.trim());

  return (
    <div
      id={sectionId}
      className="mt-5 space-y-3 rounded-[1.15rem] border-2 border-kal-accent/25 bg-kal-accent-soft/35 p-4 dark:bg-kal-accent-soft/15"
    >
      {showHeader ? (
        <div>
          {title.trim() ? (
            <p className="text-sm font-bold text-kal-text">{title}</p>
          ) : null}
          {subtitle.trim() ? (
            <p
              className={`text-xs leading-relaxed text-kal-muted ${title.trim() ? "mt-1" : ""}`}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
      {processing ? (
        <div className="flex items-center gap-2 rounded-lg border border-kal-border bg-kal-card/80 px-3 py-2 text-xs text-kal-muted">
          <Loader2 className="h-4 w-4 animate-spin text-kal-accent" />
          {processingLabel}
        </div>
      ) : null}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex min-w-0 items-start gap-2 overflow-hidden rounded-xl border border-kal-border bg-kal-card p-3"
          >
            <input
              type="checkbox"
              checked={r.excludeFromCommit === true}
              onChange={() => {
                const skip = r.excludeFromCommit === true;
                onUpdateRow(r.id, { excludeFromCommit: !skip });
              }}
              disabled={disabled}
              className="mt-2.5 h-5 w-5 shrink-0 rounded border-kal-border bg-kal-input-bg text-kal-accent focus:ring-kal-accent disabled:opacity-50"
              title="Exclude this row from Add to Today's Plan"
              aria-label="Exclude this row from Add to Today's Plan"
            />
            <div className="min-w-0 flex-1">
              <textarea
                value={r.name}
                onChange={(e) => onUpdateRow(r.id, { name: e.target.value })}
                placeholder="Task name"
                rows={1}
                disabled={disabled}
                className="min-h-[40px] min-w-0 w-full resize-y overflow-hidden rounded border border-kal-border bg-kal-input-bg px-2 py-2 text-sm font-semibold leading-5 text-kal-text placeholder:text-kal-muted [overflow-wrap:anywhere] disabled:opacity-50"
                aria-label="Task name"
              />
              <div className="mt-1.5 flex min-w-0 items-center gap-2">
                <input
                  type="time"
                  value={r.startInput}
                  onChange={(e) =>
                    onUpdateRow(r.id, { startInput: e.target.value })
                  }
                  disabled={disabled}
                  className="min-h-[32px] rounded border border-kal-border bg-kal-input-bg px-2 text-[11px] text-kal-text disabled:opacity-50"
                  aria-label="From time"
                />
                <input
                  type="time"
                  value={r.endInput}
                  onChange={(e) => onUpdateRow(r.id, { endInput: e.target.value })}
                  disabled={disabled}
                  className="min-h-[32px] rounded border border-kal-border bg-kal-input-bg px-2 text-[11px] text-kal-text disabled:opacity-50"
                  aria-label="To time"
                />
                <span className="ml-auto text-xs font-medium text-kal-muted">
                  {r.duration ?? "—"}
                </span>
              </div>
              <p className="mt-1 text-[10px] font-medium tracking-tight text-kal-accent-dark dark:text-kal-accent">
                {formatIstSlotRange12h(r.startInput, r.endInput)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemoveRow(r.id)}
              disabled={disabled}
              className="mt-1 rounded border border-kal-border p-2 text-kal-muted hover:bg-kal-card-muted hover:text-rose-600 disabled:opacity-40 dark:hover:text-rose-300"
              aria-label="Delete row"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAddEmptyRow}
        disabled={disabled}
        className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-lg border border-dashed border-kal-border text-sm text-kal-muted hover:bg-kal-card-muted disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        {addAnotherLabel}
      </button>
    </div>
  );
}
