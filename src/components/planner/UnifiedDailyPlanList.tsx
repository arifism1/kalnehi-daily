"use client";

import {
  AlarmClock,
  CalendarDays,
  Check,
  Link2,
  Loader2,
  Mic,
  Pencil,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  deleteDailyTask,
  insertDailyTask,
  updateDailyTask,
  updateDailyTaskWorkedTime,
  type DailyTaskView,
} from "@/actions/dailyPlan";
import {
  clearDailyPlanTasksCache,
  fetchDailyPlanTasksForClient,
  fetchDailyTaskSourceRawTextForUndo,
  peekDailyPlanTasksCache,
  putDailyPlanTasksCache,
} from "@/lib/fetchDailyPlanTasksForClient";
import { DailyPlanMicrotopicPicker } from "@/components/planner/DailyPlanMicrotopicPicker";
import { ScheduleRevisionReminderDialog } from "@/components/revision/ScheduleRevisionReminderDialog";
import type { ScheduleRevisionInitialSnapshot } from "@/components/revision/ScheduleRevisionReminderDialog";
import { RevisionScheduledToast } from "@/components/revision/RevisionScheduledToast";
import { useAuthStore } from "@/store/useAuthStore";
import { useDailyTaskTimerStore } from "@/store/useDailyTaskTimerStore";
import { useUndoStore } from "@/store/useUndoStore";
import { useTaskStore, type Microtopic } from "@/store/useTaskStore";
import { findOverlappingTaskPairs } from "@/lib/dailyPlanOverlap";
import { slotFromStartEnd, timeDbToInput } from "@/lib/dailyPlanTime";
import {
  DailyTaskTimerControls,
  dailyPlanDaySummary,
} from "@/components/planner/DailyTaskTimerControls";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { suggestSyllabusIdFromTitle } from "@/lib/suggestDailyTaskSyllabus";
import { formatIstSlotRange12h } from "@/lib/voiceIst";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";

// ─── Source badge ────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const isLegacyPlanImport = source === "handwritten";
  const label =
    source === "voice" ? "Voice" : isLegacyPlanImport ? "Added from plan" : "Typed";
  const Icon = source === "voice" ? Mic : Type;
  return (
    <span
      title={isLegacyPlanImport ? "Added from plan" : undefined}
      className={`inline-flex max-w-[11rem] items-center gap-1 rounded-full border border-white/30 bg-white/55 px-2 py-0.5 text-[10px] font-bold text-kal-muted backdrop-blur-sm dark:border-white/12 dark:bg-zinc-900/55 ${
        isLegacyPlanImport ? "normal-case tracking-tight" : "uppercase tracking-wide"
      }`}
    >
      <Icon className="h-3 w-3 shrink-0 text-kal-accent" aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

// ─── Edit sheet (bottom sheet / centred modal) ────────────────────────────────

type EditSheetProps = {
  task: DailyTaskView;
  /** Open the syllabus section immediately (e.g. from list “Link to syllabus”). */
  initialSyllabusExpanded?: boolean;
  onClose: () => void;
  onSaved: (patch: Partial<DailyTaskView>) => void;
};

const EDIT_SYLLABUS_SUMMARY_MAX = 96;

function truncateEditSyllabusSummary(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Prefer server embed; fall back to client syllabus catalog so links show after save. */
function buildRevisionInitialFromTask(
  t: DailyTaskView,
  catalog: Record<string, Microtopic>,
): ScheduleRevisionInitialSnapshot {
  const sid = t.syllabus_master_id?.trim() ?? "";
  const resolved = resolveSyllabusForListRow(t, catalog);
  if (resolved) {
    const title = `${(resolved.microtopic || resolved.chapter).trim() || "Topic"} · ${(resolved.subject || "Subject").trim()}`;
    return {
      title,
      microtopicId: sid || null,
      sourceTab: "syllabus",
    };
  }
  return {
    title: (t.title || "").trim() || "Topic",
    microtopicId: sid || null,
    sourceTab: sid ? "syllabus" : "custom",
  };
}

function resolveSyllabusForListRow(
  t: DailyTaskView,
  catalog: Record<string, Microtopic>,
): DailyTaskView["syllabus_master"] {
  if (t.syllabus_master) return t.syllabus_master;
  const sid = t.syllabus_master_id?.trim() ?? "";
  if (!sid) return null;
  const row = catalog[sid];
  if (!row) return null;
  return {
    id: row.id,
    subject: row.subject,
    chapter: row.chapter,
    microtopic: row.microtopic,
  };
}

function DailyTaskEditSheet({
  task,
  initialSyllabusExpanded = false,
  onClose,
  onSaved,
}: EditSheetProps) {
  const syllabusById = useTaskStore((s) => s.microtopics);
  const microtopicsList = useMemo(
    () => Object.values(syllabusById),
    [syllabusById],
  );
  const [title, setTitle] = useState(task.title ?? "");
  const [startInput, setStartInput] = useState(
    task.time_start ? timeDbToInput(task.time_start) : "",
  );
  const [endInput, setEndInput] = useState(
    task.time_end ? timeDbToInput(task.time_end) : "",
  );
  const [syllabusMasterId, setSyllabusMasterId] = useState<string | null>(
    task.syllabus_master_id ?? null,
  );
  const [syllabusSectionExpanded, setSyllabusSectionExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    setTitle(task.title ?? "");
    setStartInput(task.time_start ? timeDbToInput(task.time_start) : "");
    setEndInput(task.time_end ? timeDbToInput(task.time_end) : "");
    setSyllabusMasterId(task.syllabus_master_id ?? null);
    setSyllabusSectionExpanded(initialSyllabusExpanded);
  }, [task, initialSyllabusExpanded]);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title cannot be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    const { time_slot, time_start, time_end } = slotFromStartEnd(startInput, endInput);
    const res = await updateDailyTask(task.id, {
      title: trimmed,
      time_slot,
      time_start,
      time_end,
      syllabus_master_id: syllabusMasterId,
    });
    setSaving(false);
    if (!res.ok) {
      setError(surfaceErrorForUi(res.error));
      return;
    }
    onSaved({
      title: trimmed,
      time_slot,
      time_start,
      time_end,
      syllabus_master_id: syllabusMasterId,
    });
    onClose();
  };

  const linkedRow =
    syllabusMasterId != null && syllabusMasterId.trim() !== ""
      ? syllabusById[syllabusMasterId]
      : undefined;
  const hasValidLink = Boolean(linkedRow);
  const staleLink = Boolean(syllabusMasterId?.trim()) && !linkedRow;
  const summaryText =
    linkedRow != null
      ? truncateEditSyllabusSummary(
          `${linkedRow.chapter} · ${linkedRow.microtopic}`,
          EDIT_SYLLABUS_SUMMARY_MAX,
        )
      : "";

  const openSyllabusWithOptionalBestMatch = (applyBestMatch: boolean) => {
    setSyllabusSectionExpanded(true);
    if (!applyBestMatch) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const id = suggestSyllabusIdFromTitle(trimmed, microtopicsList);
    if (id) setSyllabusMasterId(id);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--kal-overlay)] backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        className="kal-glass-panel relative z-10 flex min-h-0 w-full max-w-lg max-h-[92dvh] flex-col overflow-hidden rounded-t-[1.25rem] sm:rounded-[1.25rem]"
        role="dialog"
        aria-modal="true"
        aria-label="Edit task"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-kal-border/60 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-muted">
              Edit task
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <SourceBadge source={task.source} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6 [-webkit-overflow-scrolling:touch]">
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-task-title" className="text-xs font-medium text-kal-muted">
              Task title
            </label>
            <textarea
              id="edit-task-title"
              ref={textareaRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={3}
              disabled={saving}
              className="mt-1.5 w-full resize-none rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-sm leading-relaxed text-kal-text [overflow-wrap:anywhere] transition-colors focus:border-kal-accent/50 focus:outline-none focus:ring-2 focus:ring-kal-accent/25 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-start" className="text-xs text-kal-muted">
                Start (optional)
              </label>
              <input
                id="edit-start"
                type="time"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                disabled={saving}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="edit-end" className="text-xs text-kal-muted">
                End (optional)
              </label>
              <input
                id="edit-end"
                type="time"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                disabled={saving}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text disabled:opacity-50"
              />
            </div>
          </div>

          <div className="border-t border-kal-border/50 pt-4">
            {syllabusSectionExpanded ? (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-muted">
                    Syllabus link (optional)
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={saving || !title.trim()}
                      onClick={() => {
                        const trimmed = title.trim();
                        if (!trimmed) return;
                        const id = suggestSyllabusIdFromTitle(
                          trimmed,
                          microtopicsList,
                        );
                        if (id) setSyllabusMasterId(id);
                      }}
                      className="text-xs font-semibold text-kal-accent hover:underline disabled:opacity-50"
                    >
                      Best match
                    </button>
                    {syllabusMasterId ? (
                      <button
                        type="button"
                        onClick={() => setSyllabusMasterId(null)}
                        disabled={saving}
                        className="text-xs font-medium text-kal-muted underline-offset-2 hover:text-kal-text hover:underline disabled:opacity-50"
                      >
                        Clear link
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSyllabusSectionExpanded(false)}
                      disabled={saving}
                      className="text-xs font-medium text-kal-muted underline-offset-2 hover:text-kal-text hover:underline disabled:opacity-50"
                    >
                      Done
                    </button>
                  </div>
                </div>
                <DailyPlanMicrotopicPicker
                  value={syllabusMasterId}
                  onChange={setSyllabusMasterId}
                  disabled={saving}
                />
              </>
            ) : hasValidLink ? (
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <p
                  className="min-w-0 text-xs leading-snug text-kal-muted [overflow-wrap:anywhere]"
                  title={summaryText}
                >
                  <span className="font-medium text-kal-text">Linked:</span>{" "}
                  {summaryText}
                </p>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openSyllabusWithOptionalBestMatch(false)}
                    disabled={saving}
                    className="text-xs font-semibold text-kal-accent hover:underline disabled:opacity-50"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyllabusMasterId(null)}
                    disabled={saving}
                    className="text-xs font-medium text-kal-muted underline-offset-2 hover:text-kal-text hover:underline disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : staleLink ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-kal-muted">
                  Syllabus link is outdated — pick again or clear.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openSyllabusWithOptionalBestMatch(true)}
                    disabled={saving}
                    className="text-xs font-semibold text-kal-accent hover:underline disabled:opacity-50"
                  >
                    Fix link
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyllabusMasterId(null)}
                    disabled={saving}
                    className="text-xs font-medium text-kal-muted underline-offset-2 hover:text-kal-text hover:underline disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openSyllabusWithOptionalBestMatch(true)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-kal-border/60 bg-kal-card-muted/40 px-2.5 py-1.5 text-xs font-medium text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-accent disabled:opacity-50"
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

        {error ? (
          <p className="mt-3 rounded-xl bg-orange-950/40 px-3 py-2 text-sm text-orange-200">
            {error}
          </p>
        ) : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-kal-border/60 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-2xl border border-kal-border py-3 text-sm font-medium text-kal-text-secondary transition-colors hover:bg-kal-card-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="kal-btn-accent flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton (matches task row shape; no blank white spinner card) ─

const DAILY_PLAN_LOADING_MESSAGE = "Figuring out your genius plan…";

function DailyPlanListSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="h-3.5 w-20 animate-pulse rounded-md bg-kal-text/[0.08] dark:bg-white/[0.08]" />
        <div className="h-3 w-14 animate-pulse rounded-md bg-kal-text/[0.06] dark:bg-white/[0.06]" />
      </div>
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-start gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-3 dark:border-white/10 dark:bg-zinc-900/35"
        >
          <div className="h-11 w-11 shrink-0 rounded-xl bg-kal-text/[0.08] dark:bg-white/[0.08]" />
          <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-kal-text/[0.07] dark:bg-white/[0.07]" />
              <div className="h-5 w-14 rounded-full bg-kal-text/[0.05] dark:bg-white/[0.05]" />
            </div>
            <div className="h-4 w-[88%] max-w-md rounded-md bg-kal-text/[0.09] dark:bg-white/[0.09]" />
            <div className="h-3 w-28 rounded-md bg-kal-text/[0.06] dark:bg-white/[0.06]" />
          </div>
          <div className="flex shrink-0 gap-1 pt-0.5">
            <div className="h-7 w-7 rounded-lg bg-kal-text/[0.06] dark:bg-white/[0.06]" />
            <div className="h-7 w-7 rounded-lg bg-kal-text/[0.06] dark:bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function dispatchDailyPlanSynced() {
  window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
}

// ─── Main list ────────────────────────────────────────────────────────────────

type Props = {
  planDate: string;
  title?: string;
  className?: string;
  /** When true, past plan dates (before local calendar "today") cannot toggle done/pending. */
  disablePastStatusToggle?: boolean;
  /** Called after tasks finish loading with the current task count (0 = empty). */
  onTasksLoaded?: (count: number) => void;
  /** When true, done tasks get "Schedule revision" (Daily Plan). */
  showScheduleRevision?: boolean;
};

export function UnifiedDailyPlanList({
  planDate,
  title,
  className = "",
  disablePastStatusToggle = false,
  onTasksLoaded,
  showScheduleRevision = false,
}: Props) {
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const statusToggleLocked = Boolean(
    disablePastStatusToggle && planDate < today,
  );
  const microtopicsById = useTaskStore((s) => s.microtopics);
  const [tasks, setTasks] = useState<DailyTaskView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    task: DailyTaskView;
    initialSyllabusExpanded: boolean;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scheduleRevisionTask, setScheduleRevisionTask] =
    useState<DailyTaskView | null>(null);
  const [revisionScheduledPopupOpen, setRevisionScheduledPopupOpen] =
    useState(false);

  const scheduleRevisionInitial = useMemo((): ScheduleRevisionInitialSnapshot => {
    if (!scheduleRevisionTask) {
      return { title: "", microtopicId: null, sourceTab: "custom" };
    }
    return buildRevisionInitialFromTask(scheduleRevisionTask, microtopicsById);
  }, [scheduleRevisionTask, microtopicsById]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      const cached = peekDailyPlanTasksCache(planDate);

      if (!silent) {
        if (cached) {
          setTasks(cached.tasks);
          setLoading(false);
        } else {
          setLoading(true);
          setTasks([]);
        }
        setError(null);
      }

      try {
        const res = await fetchDailyPlanTasksForClient(planDate);
        if (res.ok) {
          setTasks(res.tasks);
          putDailyPlanTasksCache(planDate, res.planId, res.tasks);
          if (!silent) setError(null);
          onTasksLoaded?.(res.tasks.length);
        } else if (!silent && !cached) {
          setError(surfaceErrorForUi(res.error));
        }
      } catch {
        if (!silent && !cached) setError("Could not load plan.");
      } finally {
        if (!silent && !cached) setLoading(false);
      }
    },
    [planDate],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onSync = () => {
      clearDailyPlanTasksCache();
      void load({ silent: true });
    };
    window.addEventListener("kalnehi-daily-plan-synced", onSync);
    return () => window.removeEventListener("kalnehi-daily-plan-synced", onSync);
  }, [load]);

  const overlapIds = useMemo(() => findOverlappingTaskPairs(tasks), [tasks]);

  const isDoneStatus = (s: string) => s === "done";
  const isSkippedStatus = (s: string) => s === "skipped";

  const flushDailyTaskTimer = useCallback(async (targetId: string) => {
    const st = useDailyTaskTimerStore.getState();
    if (st.taskId !== targetId) return;
    const atStart = st.workMinutesAtSessionStart;
    const sec = st.getElapsed();
    st.stop();
    const add = Math.max(0, Math.round(sec / 60) - atStart);
    if (add === 0) return;
    setBusyId(targetId);
    try {
      const res = await updateDailyTaskWorkedTime(targetId, add);
      if (!res.ok) {
        setError(surfaceErrorForUi(res.error));
        return;
      }
      setTasks((prev) =>
        prev.map((x) =>
          x.id === targetId
            ? { ...x, actual_worked_minutes: res.totalMinutes }
            : x,
        ),
      );
      const cache = peekDailyPlanTasksCache(planDate);
      if (cache) {
        putDailyPlanTasksCache(
          planDate,
          cache.planId,
          cache.tasks.map((x) =>
            x.id === targetId
              ? { ...x, actual_worked_minutes: res.totalMinutes }
              : x,
          ),
        );
      }
      dispatchDailyPlanSynced();
    } finally {
      setBusyId(null);
    }
  }, [planDate]);

  const toggleDone = async (t: DailyTaskView) => {
    if (statusToggleLocked) return;
    if (isSkippedStatus(t.status)) return;
    if (useDailyTaskTimerStore.getState().taskId === t.id) {
      await flushDailyTaskTimer(t.id);
    }
    const next = isDoneStatus(t.status) ? "pending" : "done";
    setError(null);
    setBusyId(t.id);
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    try {
      const res = await updateDailyTask(t.id, { status: next });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)),
        );
        setError(surfaceErrorForUi(res.error));
      } else {
        dispatchDailyPlanSynced();
      }
    } finally {
      setBusyId(null);
    }
  };

  const deleteTaskNow = async (t: DailyTaskView) => {
    if (useDailyTaskTimerStore.getState().taskId === t.id) {
      await flushDailyTaskTimer(t.id);
    }
    setDeletingId(t.id);
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    const sourceRaw = await fetchDailyTaskSourceRawTextForUndo(t.id);
    const snapshot: DailyTaskView = { ...t, source_raw_text: sourceRaw };
    const res = await deleteDailyTask(t.id);
    setDeletingId(null);
    if (!res.ok) {
      setTasks((prev) => {
        const already = prev.find((x) => x.id === t.id);
        return already
          ? prev
          : [...prev, t].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      });
      setError(surfaceErrorForUi(res.error));
      return;
    }

    dispatchDailyPlanSynced();

    const src = snapshot.source;
    if (src !== "typed" && src !== "voice" && src !== "handwritten") {
      return;
    }

    useUndoStore.getState().offerUndo({
      message: "Task deleted",
      autoDismissMs: 3000,
      runUndo: async () => {
        const ins = await insertDailyTask({
          plan_date: planDate,
          id: snapshot.id,
          title: snapshot.title,
          time_slot: snapshot.time_slot,
          time_start: snapshot.time_start,
          time_end: snapshot.time_end,
          status: snapshot.status,
          source: src,
          source_raw_text: snapshot.source_raw_text,
          priority: snapshot.priority,
          syllabus_master_id: snapshot.syllabus_master_id ?? null,
          actual_worked_minutes: snapshot.actual_worked_minutes ?? 0,
        });
        if (!ins.ok) {
          setError(ins.error);
          return;
        }
        setTasks((prev) => {
          if (prev.some((x) => x.id === snapshot.id)) return prev;
          return [...prev, snapshot].sort((a, b) =>
            a.created_at < b.created_at ? -1 : 1,
          );
        });
      },
    });
  };

  const handleEditSaved = (id: string, patch: Partial<DailyTaskView>) => {
    setTasks((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const merged: DailyTaskView = { ...x, ...patch };
        const sid =
          patch.syllabus_master_id !== undefined
            ? patch.syllabus_master_id
            : x.syllabus_master_id;
        merged.syllabus_master_id = sid;
        if (sid && microtopicsById[sid]) {
          const r = microtopicsById[sid];
          merged.syllabus_master = {
            id: r.id,
            subject: r.subject,
            chapter: r.chapter,
            microtopic: r.microtopic,
          };
        } else {
          merged.syllabus_master = null;
        }
        return merged;
      }),
    );
    dispatchDailyPlanSynced();
  };

  const daySummaryLine = useMemo(
    () => dailyPlanDaySummary(tasks).line,
    [tasks],
  );

  return (
    <>
      <section className={`kal-glass-panel rounded-[1.25rem] p-4 sm:p-6 ${className}`}>
        {title ? (
          <h2 className="kal-section-heading mb-4">{title}</h2>
        ) : null}

        {loading ? (
          <>
            <div
              role="status"
              aria-live="polite"
              className="mb-5 flex items-center gap-2.5 text-sm font-medium leading-snug text-kal-muted"
            >
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-kal-accent/70"
                aria-hidden
              />
              <span>{DAILY_PLAN_LOADING_MESSAGE}</span>
            </div>
            <DailyPlanListSkeleton />
          </>
        ) : error ? (
          <p className="text-sm text-[var(--kal-danger-text)]" role="alert">
            {error}
          </p>
        ) : tasks.length === 0 ? (
          <div className="kal-glass-subtle flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-white/35 py-8 text-center dark:border-white/15">
            <CalendarDays className="mb-2 h-6 w-6" style={{ color: "#FAC775" }} aria-hidden />
            <p className="text-sm font-semibold text-kal-text">Nothing here yet</p>
            <p className="mt-1 text-xs text-kal-muted">Your plan is empty for this date.</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs font-semibold text-kal-muted">
              {daySummaryLine}
            </p>

            <ul className="space-y-2.5">
              {tasks.map((t) => {
                const st = t.time_start ? timeDbToInput(t.time_start) : "";
                const et = t.time_end ? timeDbToInput(t.time_end) : "";
                const overlap = overlapIds.has(t.id);
                const done = isDoneStatus(t.status);
                const skipped = isSkippedStatus(t.status);
                const completed = done || skipped;
                const isDeleting = deletingId === t.id;
                const resolvedSyllabus = resolveSyllabusForListRow(
                  t,
                  microtopicsById,
                );
                const sid = t.syllabus_master_id?.trim() ?? "";
                const showSyllabusLinkCta =
                  !skipped && !done && resolvedSyllabus == null;
                const syllabusCtaLabel =
                  sid && !resolvedSyllabus ? "Fix syllabus link" : "Link to syllabus";

                const checkboxReadOnly = statusToggleLocked && !skipped;
                const statusCheckboxLabel =
                  checkboxReadOnly
                    ? done
                      ? "Done (read-only, past day on saved plans)"
                      : "Not done (read-only, past day on saved plans)"
                    : done
                      ? "Mark as not done"
                      : skipped
                        ? "Skipped"
                        : "Mark as done";

                return (
                  <li
                    key={t.id}
                    // `group` enables sm:group-hover to show action buttons on desktop hover
                    className={`group rounded-2xl border px-3 py-3 shadow-sm transition-all ${
                      done
                        ? "border-white/20 bg-white/45 opacity-75 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/45"
                        : skipped
                          ? "border-white/15 bg-white/25 opacity-60 backdrop-blur-sm dark:border-white/8 dark:bg-zinc-900/30"
                          : "kal-glass-subtle border-white/25 dark:border-white/12"
                    } ${isDeleting ? "pointer-events-none opacity-40" : ""}`}
                  >
                    {/* Layout: checkbox (44px tap) → title/time → badges → edit/delete */}
                    <div className="flex items-start gap-2">
                      {/* Checkbox — min 44×44 touch target, primary fill when done */}
                      <button
                        type="button"
                        role="checkbox"
                        disabled={busyId === t.id || isDeleting || skipped || statusToggleLocked}
                        onClick={() => void toggleDone(t)}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                          checkboxReadOnly
                            ? "disabled:cursor-not-allowed disabled:opacity-90 focus-visible:ring-kal-muted/25"
                            : "disabled:opacity-40"
                        } ${
                          done
                            ? "border-kal-accent bg-kal-accent text-white"
                            : skipped
                              ? "border-kal-muted/40 bg-kal-muted/10 text-kal-muted cursor-default"
                              : "border-kal-accent/45 bg-white text-transparent hover:border-kal-accent hover:bg-white dark:border-white/35 dark:bg-zinc-900/90 dark:hover:border-kal-accent/80 dark:hover:bg-zinc-900"
                        }`}
                        aria-checked={completed}
                        aria-label={statusCheckboxLabel}
                      >
                        {busyId === t.id ? (
                          <Loader2
                            className={`h-5 w-5 animate-spin ${done ? "text-white" : "text-kal-accent"}`}
                          />
                        ) : done ? (
                          <Check className="h-5 w-5 text-white" strokeWidth={2.75} />
                        ) : skipped ? (
                          <X className="h-4 w-4 text-kal-muted" strokeWidth={2.5} />
                        ) : null}
                      </button>

                      {/* Task body — title & time first, then badges */}
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          disabled={isDeleting || skipped}
                          onClick={() =>
                            setEditing({
                              task: t,
                              initialSyllabusExpanded: false,
                            })
                          }
                          className="w-full text-left disabled:pointer-events-none"
                          aria-label={`Edit "${t.title}"`}
                        >
                          <p
                            className={`text-sm font-semibold leading-snug [overflow-wrap:anywhere] ${
                              done
                                ? "text-kal-muted line-through decoration-kal-muted/60"
                                : skipped
                                  ? "text-kal-muted/70 line-through decoration-kal-muted/40"
                                  : "text-kal-text"
                            }`}
                          >
                            {t.title}
                          </p>
                          {resolvedSyllabus ? (
                            <p className="mt-1 text-[10px] font-medium leading-snug text-kal-muted/90 [overflow-wrap:anywhere]">
                              {resolvedSyllabus.chapter} · {resolvedSyllabus.microtopic}
                            </p>
                          ) : null}
                          {(st || et) && (
                            <p className="mt-1 text-xs font-medium text-kal-accent-dark dark:text-kal-accent">
                              {formatIstSlotRange12h(st, et)}
                            </p>
                          )}
                          {!st && !et && t.time_slot ? (
                            <p className="mt-1 text-xs text-kal-muted">{t.time_slot}</p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <SourceBadge source={t.source} />
                            {overlap ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                                Overlap
                              </span>
                            ) : null}
                          </div>
                        </button>
                        {showSyllabusLinkCta ? (
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() =>
                              setEditing({
                                task: t,
                                initialSyllabusExpanded: true,
                              })
                            }
                            className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-kal-border/60 bg-kal-card-muted/40 px-3 py-2 text-xs font-semibold text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-accent disabled:opacity-40 sm:w-auto sm:justify-start"
                          >
                            <Link2
                              className="h-3.5 w-3.5 shrink-0 text-kal-accent/80"
                              aria-hidden
                            />
                            {syllabusCtaLabel}
                          </button>
                        ) : null}
                        {done && showScheduleRevision && userId ? (
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setScheduleRevisionTask(t)}
                            className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-kal-accent/35 bg-kal-accent/10 px-3 py-2 text-xs font-semibold text-kal-accent transition-colors hover:bg-kal-accent/15 disabled:opacity-40 sm:w-auto sm:justify-start"
                            aria-haspopup="dialog"
                          >
                            <AlarmClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Schedule revision
                          </button>
                        ) : null}
                        <DailyTaskTimerControls
                          task={{ ...t, actual_worked_minutes: t.actual_worked_minutes ?? 0 }}
                          planDate={planDate}
                          today={today}
                          onBeforeStartOther={flushDailyTaskTimer}
                          onWorkedSaved={(id, m) => {
                            setTasks((prev) =>
                              prev.map((x) =>
                                x.id === id ? { ...x, actual_worked_minutes: m } : x,
                              ),
                            );
                            const cache = peekDailyPlanTasksCache(planDate);
                            if (cache) {
                              putDailyPlanTasksCache(
                                planDate,
                                cache.planId,
                                cache.tasks.map((x) =>
                                  x.id === id
                                    ? { ...x, actual_worked_minutes: m }
                                    : x,
                                ),
                              );
                            }
                            dispatchDailyPlanSynced();
                          }}
                          onError={(msg) => setError(msg)}
                          busy={busyId === t.id}
                          anyOperationBusy={busyId != null}
                          setBusy={setBusyId}
                        />
                      </div>

                      {/*
                       * Action buttons — compact, anchored right
                       */}
                      <div className="flex shrink-0 items-start gap-0.5 pt-0.5 opacity-90 transition-opacity duration-150 sm:opacity-70 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              task: t,
                              initialSyllabusExpanded: false,
                            })
                          }
                          disabled={isDeleting}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-kal-muted/80 transition-colors hover:bg-kal-card-muted hover:text-kal-accent disabled:opacity-40 sm:h-7 sm:w-7"
                          aria-label="Edit task"
                        >
                          <Pencil className="h-[13px] w-[13px]" strokeWidth={2} />
                        </button>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => void deleteTaskNow(t)}
                          disabled={isDeleting}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-kal-muted/80 transition-colors hover:bg-orange-500/10 hover:text-orange-600 disabled:opacity-40 dark:hover:text-orange-400 sm:h-7 sm:w-7"
                          aria-label="Delete task"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-[13px] w-[13px] animate-spin" />
                          ) : (
                            <Trash2 className="h-[13px] w-[13px]" strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <RevisionScheduledToast
        open={revisionScheduledPopupOpen}
        onDismiss={() => setRevisionScheduledPopupOpen(false)}
      />

      <ScheduleRevisionReminderDialog
        key={scheduleRevisionTask?.id ?? "closed"}
        open={scheduleRevisionTask != null}
        onOpenChange={(v) => {
          if (!v) setScheduleRevisionTask(null);
        }}
        userId={userId}
        showVoice={false}
        dialogTitle="Schedule revision"
        titleId="daily-plan-schedule-revision-dialog"
        initial={scheduleRevisionInitial}
        saveButtonLabel="Save reminder"
        onSaved={() => setRevisionScheduledPopupOpen(true)}
      />

      {/* Edit sheet */}
      {editing ? (
        <DailyTaskEditSheet
          key={`${editing.task.id}-${editing.initialSyllabusExpanded}`}
          task={editing.task}
          initialSyllabusExpanded={editing.initialSyllabusExpanded}
          onClose={() => setEditing(null)}
          onSaved={(patch) => {
            handleEditSaved(editing.task.id, patch);
          }}
        />
      ) : null}
    </>
  );
}
