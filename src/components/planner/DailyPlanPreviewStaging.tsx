"use client";

import { Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DailyPlanMicrotopicPicker } from "@/components/planner/DailyPlanMicrotopicPicker";
import { formatIstSlotDurationLabel } from "@/lib/voiceIst";
import { suggestSyllabusIdFromTitle } from "@/lib/suggestDailyTaskSyllabus";
import { useTaskStore } from "@/store/useTaskStore";

export type DailyPlanPreviewRow = {
  id: string;
  name: string;
  startInput: string;
  endInput: string;
  duration: string | null;
  /** Optional snippet stored on commit (e.g. voice transcript chunk). */
  sourceRaw?: string;
  /**
   * When true, row is skipped for the bulk add-to-plan action. Omitted/false = include named rows.
   */
  excludeFromCommit?: boolean;
  /** Optional link to `syllabus_master.id` before saving to `daily_tasks`. */
  syllabus_master_id?: string | null;
};

/** Whether this row should be committed with the bulk "add to plan" action. */
export function isPreviewRowIncluded(r: DailyPlanPreviewRow): boolean {
  return Boolean(r.name.trim()) && r.excludeFromCommit !== true;
}

const SYLLABUS_SUMMARY_MAX = 96;

function truncateSummary(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
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
  /** Tighter padding and spacing (e.g. compact mobile preview). */
  compact?: boolean;
  /** Checkbox hint when excluding a row from the next save (date-aware from parent). */
  excludeFromSaveHint?: string;
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
  compact = false,
  excludeFromSaveHint = "Exclude this row from the next save",
}: Props) {
  const syllabusById = useTaskStore((s) => s.microtopics);
  const microtopicsList = useMemo(
    () => Object.values(syllabusById),
    [syllabusById],
  );
  const [expandedSyllabusIds, setExpandedSyllabusIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const valid = new Set(rows.map((r) => r.id));
    setExpandedSyllabusIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [rows]);

  const showHeader = Boolean(title.trim() || subtitle.trim());

  const setExpanded = (id: string, open: boolean) => {
    setExpandedSyllabusIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  /** Expand syllabus editor; optionally run best-match from task title (Link / Fix link). */
  const openSyllabusEditor = useCallback(
    (rowId: string, taskTitle: string, applyBestMatch: boolean) => {
      setExpanded(rowId, true);
      if (!applyBestMatch) return;
      const trimmed = taskTitle.trim();
      if (!trimmed) return;
      const id = suggestSyllabusIdFromTitle(trimmed, microtopicsList);
      if (id) onUpdateRow(rowId, { syllabus_master_id: id });
    },
    [microtopicsList, onUpdateRow],
  );

  return (
    <div
      id={sectionId}
      className={
        compact
          ? "mt-0 space-y-2.5 rounded-xl border-2 border-kal-accent/35 bg-kal-accent-soft/50 p-3.5 shadow-sm ring-1 ring-rose-900/[0.04] backdrop-blur-md dark:bg-kal-accent-soft/20 dark:ring-white/5"
          : "mt-5 space-y-3 rounded-[1.15rem] border-2 border-kal-accent/30 bg-kal-accent-soft/45 p-4 shadow-sm backdrop-blur-md dark:bg-kal-accent-soft/20"
      }
    >
      {showHeader ? (
        <div>
          {title.trim() ? (
            <p
              className={
                compact
                  ? "text-xs font-bold text-kal-text"
                  : "text-sm font-bold text-kal-text"
              }
            >
              {title}
            </p>
          ) : null}
          {subtitle.trim() ? (
            <p
              className={`text-kal-muted ${compact ? "text-[11px] leading-snug" : "text-xs leading-relaxed"} ${title.trim() ? (compact ? "mt-0.5" : "mt-1") : ""}`}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
      {processing ? (
        <div className="kal-glass-subtle flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-kal-muted">
          <Loader2 className="h-4 w-4 animate-spin text-kal-accent" />
          {processingLabel}
        </div>
      ) : null}
      <ul className={compact ? "space-y-1.5" : "space-y-2"}>
        {rows.map((r) => {
          const linkedId = r.syllabus_master_id?.trim() || null;
          const linkedRow = linkedId ? syllabusById[linkedId] : undefined;
          const hasValidLink = Boolean(linkedRow);
          const expanded = expandedSyllabusIds.has(r.id);
          const summaryText =
            linkedRow != null
              ? truncateSummary(
                  `${linkedRow.chapter} · ${linkedRow.microtopic}`,
                  SYLLABUS_SUMMARY_MAX,
                )
              : "";

          return (
            <li
              key={r.id}
              className={
                compact
                  ? "kal-glass-subtle flex min-w-0 items-start gap-1.5 overflow-hidden rounded-lg p-2"
                  : "kal-glass-subtle flex min-w-0 items-start gap-2 overflow-hidden rounded-xl p-3"
              }
            >
              <input
                type="checkbox"
                checked={r.excludeFromCommit === true}
                onChange={() => {
                  const skip = r.excludeFromCommit === true;
                  onUpdateRow(r.id, { excludeFromCommit: !skip });
                }}
                disabled={disabled}
                className={
                  compact
                    ? "mt-1.5 h-4 w-4 shrink-0 rounded border-kal-border bg-kal-input-bg text-kal-accent focus:ring-kal-accent disabled:opacity-50"
                    : "mt-2.5 h-5 w-5 shrink-0 rounded border-kal-border bg-kal-input-bg text-kal-accent focus:ring-kal-accent disabled:opacity-50"
                }
                title={excludeFromSaveHint}
                aria-label={excludeFromSaveHint}
              />
              <div className="min-w-0 flex-1">
                <textarea
                  value={r.name}
                  onChange={(e) => onUpdateRow(r.id, { name: e.target.value })}
                  placeholder="Task name"
                  rows={1}
                  disabled={disabled}
                  className={
                    compact
                      ? "min-h-[36px] min-w-0 w-full resize-y overflow-hidden rounded border border-kal-border bg-kal-input-bg px-2 py-1.5 text-sm font-semibold leading-5 text-kal-text placeholder:text-kal-muted [overflow-wrap:anywhere] disabled:opacity-50"
                      : "min-h-[40px] min-w-0 w-full resize-y overflow-hidden rounded border border-kal-border bg-kal-input-bg px-2 py-2 text-sm font-semibold leading-5 text-kal-text placeholder:text-kal-muted [overflow-wrap:anywhere] disabled:opacity-50"
                  }
                  aria-label="Task name"
                />
                <div
                  className={
                    compact
                      ? "mt-1 flex min-w-0 items-end gap-1.5"
                      : "mt-1.5 flex min-w-0 items-end gap-2"
                  }
                >
                  <div className="flex flex-col">
                    <span className="mb-0.5 block text-[11px] text-kal-muted">Start</span>
                    <input
                      type="time"
                      value={r.startInput}
                      onChange={(e) =>
                        onUpdateRow(r.id, { startInput: e.target.value })
                      }
                      disabled={disabled}
                      className={
                        compact
                          ? "min-h-[30px] rounded border border-kal-border bg-kal-input-bg px-1.5 text-[11px] text-kal-text disabled:opacity-50"
                          : "min-h-[32px] rounded border border-kal-border bg-kal-input-bg px-2 text-[11px] text-kal-text disabled:opacity-50"
                      }
                      aria-label="From time"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="mb-0.5 block text-[11px] text-kal-muted">End</span>
                    <input
                      type="time"
                      value={r.endInput}
                      onChange={(e) =>
                        onUpdateRow(r.id, { endInput: e.target.value })
                      }
                      disabled={disabled}
                      className={
                        compact
                          ? "min-h-[30px] rounded border border-kal-border bg-kal-input-bg px-1.5 text-[11px] text-kal-text disabled:opacity-50"
                          : "min-h-[32px] rounded border border-kal-border bg-kal-input-bg px-2 text-[11px] text-kal-text disabled:opacity-50"
                      }
                      aria-label="To time"
                    />
                  </div>
                  <span className="ml-auto text-[11px] font-medium text-kal-muted">
                    {r.duration ?? "—"}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-medium tracking-tight text-kal-accent-dark dark:text-kal-accent">
                  {formatIstSlotDurationLabel(r.startInput, r.endInput)}
                </p>

                <div className="mt-2 border-t border-kal-border/35 pt-2">
                  {expanded ? (
                    <div>
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-kal-muted">
                          Syllabus (optional)
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={disabled || !r.syllabus_master_id}
                            onClick={() =>
                              onUpdateRow(r.id, { syllabus_master_id: null })
                            }
                            className="text-[10px] font-medium text-kal-muted underline-offset-2 hover:text-kal-text hover:underline disabled:opacity-40"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            disabled={disabled || !r.name.trim()}
                            onClick={() => {
                              const id = suggestSyllabusIdFromTitle(
                                r.name,
                                microtopicsList,
                              );
                              if (id) onUpdateRow(r.id, { syllabus_master_id: id });
                            }}
                            className="text-[10px] font-semibold text-kal-accent hover:underline disabled:opacity-40"
                          >
                            Best match
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => setExpanded(r.id, false)}
                            className="text-[10px] font-medium text-kal-muted underline-offset-2 hover:text-kal-text hover:underline disabled:opacity-40"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                      <DailyPlanMicrotopicPicker
                        value={r.syllabus_master_id ?? null}
                        onChange={(id) =>
                          onUpdateRow(r.id, { syllabus_master_id: id })
                        }
                        disabled={disabled}
                        compact={compact}
                      />
                    </div>
                  ) : hasValidLink ? (
                    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <p
                        className="min-w-0 text-[11px] leading-snug text-kal-muted [overflow-wrap:anywhere]"
                        title={summaryText}
                      >
                        <span className="font-medium text-kal-text">
                          Linked:
                        </span>{" "}
                        {summaryText}
                      </p>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => openSyllabusEditor(r.id, r.name, false)}
                          className="text-[11px] font-semibold text-kal-accent hover:underline disabled:opacity-40"
                          aria-expanded={false}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            onUpdateRow(r.id, { syllabus_master_id: null });
                            setExpanded(r.id, false);
                          }}
                          className="text-[11px] font-medium text-kal-muted underline-offset-2 hover:text-kal-text hover:underline disabled:opacity-40"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : linkedId && !linkedRow ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] text-kal-muted">
                        Syllabus link is outdated — pick again or clear.
                      </p>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => openSyllabusEditor(r.id, r.name, true)}
                        className="text-[11px] font-semibold text-kal-accent hover:underline disabled:opacity-40"
                      >
                        Fix link
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          onUpdateRow(r.id, { syllabus_master_id: null })
                        }
                        className="text-[11px] font-medium text-kal-muted underline-offset-2 hover:text-kal-text hover:underline disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => openSyllabusEditor(r.id, r.name, true)}
                      aria-expanded={false}
                      className={
                        compact
                          ? "inline-flex items-center gap-1.5 rounded-lg border border-kal-border/60 bg-kal-card-muted/40 px-2 py-1 text-[11px] font-medium text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-accent disabled:opacity-40"
                          : "inline-flex items-center gap-1.5 rounded-lg border border-kal-border/60 bg-kal-card-muted/40 px-2.5 py-1.5 text-xs font-medium text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-accent disabled:opacity-40"
                      }
                    >
                      <Link2
                        className="h-3.5 w-3.5 shrink-0 text-kal-accent/80"
                        aria-hidden
                      />
                      Link to Syllabus
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveRow(r.id)}
                disabled={disabled}
                className={
                  compact
                    ? "mt-0.5 rounded border border-kal-border p-1.5 text-kal-muted hover:bg-kal-card-muted hover:text-kal-danger-text disabled:opacity-40"
                    : "mt-1 rounded border border-kal-border p-2 text-kal-muted hover:bg-kal-card-muted hover:text-kal-danger-text disabled:opacity-40"
                }
                aria-label="Delete row"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onAddEmptyRow}
        disabled={disabled}
        className={
          compact
            ? "flex w-full min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/35 bg-white/30 text-xs text-kal-muted backdrop-blur-sm hover:bg-white/50 disabled:opacity-40 dark:border-white/15 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/50"
            : "flex w-full min-h-[40px] items-center justify-center gap-2 rounded-lg border border-dashed border-white/35 bg-white/30 text-sm text-kal-muted backdrop-blur-sm hover:bg-white/50 disabled:opacity-40 dark:border-white/15 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/50"
        }
      >
        <Plus className="h-4 w-4" />
        {addAnotherLabel}
      </button>
    </div>
  );
}
