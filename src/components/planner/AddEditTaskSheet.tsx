"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TablesUpdate } from "@/types/supabase";
import {
  chaptersForSubject,
  hasDuplicateMicrotopicOnDate,
} from "@/lib/taskPlanner";
import {
  dbTimeToInputValue,
  inputTimeToDb,
  minutesBetweenTimeInputs,
} from "@/lib/taskTime";
import {
  applyOptimisticTaskDelete,
  applyOptimisticTaskUpdate,
} from "@/lib/taskMutations";
import { quickCreateEmptyTask } from "@/lib/quickTaskCreate";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore, type Task } from "@/store/useTaskStore";

import { TASK_STATUS } from "@/components/task/TaskCard";
import { TaskPlanner } from "@/components/planner/TaskPlanner";

const AUTOSAVE_MS = 350;

function taskIsDiscardableDraft(t: Task): boolean {
  const hasName = (t.name ?? "").trim().length > 0;
  const hasLink = !!(t.microtopic_id && String(t.microtopic_id).trim());
  const hasTime = !!(t.start_time || t.end_time);
  const hasMarks = t.marks_value != null && Number.isFinite(Number(t.marks_value));
  const hasEst =
    (t.estimated_minutes != null && t.estimated_minutes > 0) ||
    (t.estimated_time_minutes != null && t.estimated_time_minutes > 0);
  return (
    !hasName &&
    !hasLink &&
    !hasTime &&
    !hasMarks &&
    !hasEst &&
    t.status === TASK_STATUS.pending
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  task: Task | null;
  defaultAssignedDate: string;
};

export function AddEditTaskSheet({
  open,
  onClose,
  mode,
  task,
  defaultAssignedDate,
}: Props) {
  const userId = useAuthStore((s) => s.user?.id);
  const syllabusById = useTaskStore((s) => s.microtopics);
  const tasksRecord = useTaskStore((s) => s.tasks);

  const microtopics = useMemo(
    () => Object.values(syllabusById),
    [syllabusById],
  );
  const tasksList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const [taskName, setTaskName] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [marks, setMarks] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [microtopicId, setMicrotopicId] = useState("");
  const [assignedDate, setAssignedDate] = useState(defaultAssignedDate);
  const [status, setStatus] = useState<string>(TASK_STATUS.pending);
  const [error, setError] = useState<string | null>(null);
  const [draftTaskId, setDraftTaskId] = useState<string | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const syllabusRef = useRef(syllabusById);
  syllabusRef.current = syllabusById;
  const tasksListRef = useRef(tasksList);
  tasksListRef.current = tasksList;

  const formRef = useRef({
    taskName,
    fromTime,
    toTime,
    estimatedMinutes,
    marks,
    microtopicId,
    assignedDate,
    status,
  });
  formRef.current = {
    taskName,
    fromTime,
    toTime,
    estimatedMinutes,
    marks,
    microtopicId,
    assignedDate,
    status,
  };

  const activeTaskIdRef = useRef<string | null>(null);
  activeTaskIdRef.current =
    mode === "edit" ? task?.id ?? null : draftTaskId;

  const excludeDupIdRef = useRef<string | undefined>(undefined);
  excludeDupIdRef.current =
    mode === "edit" ? task?.id : draftTaskId ?? undefined;

  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const chapters = useMemo(
    () => chaptersForSubject(microtopics, subject),
    [microtopics, subject],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraftError(null);
    setAssignedDate(defaultAssignedDate);
  }, [open, defaultAssignedDate]);

  useEffect(() => {
    if (!open || mode !== "edit" || !task) return;
    const row = task.microtopic_id
      ? syllabusById[task.microtopic_id]
      : undefined;
    const derivedName =
      task.name?.trim() ||
      row?.microtopic ||
      "";
    setTaskName(derivedName);
    setFromTime(dbTimeToInputValue(task.start_time));
    setToTime(dbTimeToInputValue(task.end_time));
    setEstimatedMinutes(
      task.estimated_minutes != null && task.estimated_minutes > 0
        ? String(task.estimated_minutes)
        : "",
    );
    setMarks(task.marks_value != null ? String(task.marks_value) : "");
    setSubject(row?.subject ?? "");
    setChapter(row?.chapter ?? "");
    setMicrotopicId(task.microtopic_id ?? "");
    setStatus(task.status);
  }, [open, mode, task, syllabusById]);

  useEffect(() => {
    if (!open || mode !== "add") return;
    setTaskName("");
    setFromTime("");
    setToTime("");
    setEstimatedMinutes("");
    setMarks("");
    setSubject("");
    setChapter("");
    setMicrotopicId("");
    setStatus(TASK_STATUS.pending);
  }, [open, mode]);

  useEffect(() => {
    if (!open || mode !== "add" || !userId) return;
    let cancelled = false;
    setDraftTaskId(null);
    setDraftBusy(true);
    void (async () => {
      const r = await quickCreateEmptyTask(userId, defaultAssignedDate);
      if (cancelled) {
        if (r.ok) await applyOptimisticTaskDelete(r.id, userId);
        return;
      }
      setDraftBusy(false);
      if (r.ok) {
        setDraftTaskId(r.id);
        setDraftError(null);
      } else {
        setDraftError(r.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, userId, defaultAssignedDate]);

  useEffect(() => {
    if (!open || mode === "edit") return;
    if (subject && !chapters.includes(chapter)) {
      setChapter(chapters[0] ?? "");
    }
  }, [open, mode, subject, chapter, chapters]);

  const runFlush = useCallback(async () => {
    const tid = activeTaskIdRef.current;
    const uid = userId;
    if (!tid || !uid) return;

    const f = formRef.current;
    const linkId = f.microtopicId.trim() || null;
    const linkedRow = linkId ? syllabusRef.current[linkId] : undefined;
    const nameRaw = f.taskName.trim() || linkedRow?.microtopic?.trim() || "";
    const name = nameRaw.length > 0 ? nameRaw : null;

    const marksNum = f.marks.trim() ? Number(f.marks) : NaN;
    if (f.marks.trim() && !Number.isFinite(marksNum)) {
      setError("Marks must be a number.");
      return;
    }

    const estRaw = f.estimatedMinutes.trim();
    const estNum = estRaw ? Number(estRaw) : NaN;
    if (estRaw && (!Number.isFinite(estNum) || estNum < 0)) {
      setError("Estimated minutes must be a non-negative number.");
      return;
    }

    if (
      linkId &&
      hasDuplicateMicrotopicOnDate(
        tasksListRef.current,
        linkId,
        f.assignedDate,
        excludeDupIdRef.current,
      )
    ) {
      setError("You already linked this syllabus topic on that day.");
      return;
    }

    setError(null);

    const startDb = inputTimeToDb(f.fromTime);
    const endDb = inputTimeToDb(f.toTime);

    const patch: TablesUpdate<"tasks"> = {
      assigned_date: f.assignedDate,
      name,
      microtopic_id: linkId,
      status: f.status,
      start_time: startDb,
      end_time: endDb,
      estimated_minutes: Number.isFinite(estNum) ? Math.round(estNum) : null,
      marks_value: Number.isFinite(marksNum) ? marksNum : null,
    };

    const res = await applyOptimisticTaskUpdate(tid, patch, uid);
    if (!res.ok) setError(res.error);
  }, [userId]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void runFlush();
    }, AUTOSAVE_MS);
  }, [runFlush]);

  const onFromTimeChange = useCallback(
    (v: string) => {
      setFromTime(v);
      const m = minutesBetweenTimeInputs(v, toTime);
      if (m != null) setEstimatedMinutes(String(m));
      scheduleFlush();
    },
    [toTime, scheduleFlush],
  );

  const onToTimeChange = useCallback(
    (v: string) => {
      setToTime(v);
      const m = minutesBetweenTimeInputs(fromTime, v);
      if (m != null) setEstimatedMinutes(String(m));
      scheduleFlush();
    },
    [fromTime, scheduleFlush],
  );

  const handleClose = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    void (async () => {
      const tid = activeTaskIdRef.current;
      const uid = userId;
      if (tid && uid) {
        await runFlush();
        if (modeRef.current === "add") {
          const row = useTaskStore.getState().tasks[tid];
          if (row && taskIsDiscardableDraft(row)) {
            await applyOptimisticTaskDelete(tid, uid);
          }
        }
      }
      setDraftTaskId(null);
      onClose();
    })();
  }, [userId, onClose, runFlush]);

  if (!open) return null;

  const hasSyllabus = microtopics.length > 0;
  const draftReady = mode === "edit" || !!draftTaskId;
  const blockUi = (mode === "add" && draftBusy) || !!draftError;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--kal-overlay)]"
        onClick={handleClose}
      />
      <div
        className="relative z-10 max-h-[min(92vh,40rem)] w-full max-w-lg overflow-y-auto rounded-t-[1.25rem] border border-kal-border bg-kal-card p-4 kal-shadow-card sm:rounded-[1.25rem] sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-2 border-b border-kal-border pb-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-muted">
              Task planner
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-kal-text">
              {mode === "add" ? "New task" : "Edit task"}
            </h2>
            {userId ? (
              <p className="mt-1 text-[10px] text-kal-muted">
                Saved automatically as you edit.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {draftError ? (
          <p className="mt-4 rounded-xl bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {draftError}
          </p>
        ) : null}

        {mode === "add" && draftBusy ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-kal-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            Starting draft…
          </div>
        ) : null}

        {draftReady && !draftBusy ? (
          <div className="mt-5 space-y-5">
            <div>
              <label
                htmlFor="task-name"
                className="text-xs font-medium text-kal-muted"
              >
                Task name
              </label>
              <textarea
                id="task-name"
                value={taskName}
                onChange={(e) => {
                  setTaskName(e.target.value);
                  scheduleFlush();
                }}
                rows={4}
                placeholder="What do you want to get done?"
                disabled={blockUi}
                className="mt-2 min-h-[7.5rem] w-full resize-y rounded-2xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base leading-relaxed text-kal-text placeholder:text-kal-muted transition-colors duration-200 focus:border-kal-accent/50 focus:outline-none focus:ring-2 focus:ring-kal-accent/25 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-kal-muted">From (optional)</label>
                <input
                  type="time"
                  value={fromTime}
                  onChange={(e) => onFromTimeChange(e.target.value)}
                  disabled={blockUi}
                  className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base text-kal-text transition-colors duration-200 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-kal-muted">To (optional)</label>
                <input
                  type="time"
                  value={toTime}
                  onChange={(e) => onToTimeChange(e.target.value)}
                  disabled={blockUi}
                  className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base text-kal-text transition-colors duration-200 disabled:opacity-50"
                />
              </div>
            </div>
            <p className="-mt-2 text-[11px] text-kal-muted">
              Filling both times fills estimated minutes automatically.
            </p>

            <div>
              <label className="text-xs text-kal-muted">Marks (optional)</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={marks}
                onChange={(e) => {
                  setMarks(e.target.value);
                  scheduleFlush();
                }}
                placeholder="—"
                disabled={blockUi}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base text-kal-text placeholder:text-kal-muted transition-colors duration-200 disabled:opacity-50"
              />
            </div>

            {hasSyllabus ? (
              <div className="rounded-2xl border border-kal-border bg-kal-card-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
                  Syllabus &amp; schedule
                </p>
                <p className="mt-1 text-[11px] text-kal-muted">
                  Select subject → chapter → microtopic, then date and estimate.
                </p>
                <div className="mt-4">
                  <TaskPlanner
                    microtopics={microtopics}
                    tasks={tasksList}
                    subject={subject}
                    chapter={chapter}
                    microtopicId={microtopicId}
                    assignedDate={assignedDate}
                    estimatedMinutes={estimatedMinutes}
                    onSubjectChange={(s) => {
                      setSubject(s);
                      setChapter("");
                      setMicrotopicId("");
                      scheduleFlush();
                    }}
                    onChapterChange={(c) => {
                      setChapter(c);
                      setMicrotopicId("");
                      scheduleFlush();
                    }}
                    onMicrotopicIdChange={(id) => {
                      setMicrotopicId(id);
                      scheduleFlush();
                    }}
                    onAssignedDateChange={(d) => {
                      setAssignedDate(d);
                      scheduleFlush();
                    }}
                    onEstimatedMinutesChange={(m) => {
                      setEstimatedMinutes(m);
                      scheduleFlush();
                    }}
                    excludeTaskId={
                      mode === "edit" ? task?.id : draftTaskId ?? undefined
                    }
                    disabled={blockUi}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-kal-muted">
                      Est. minutes (optional)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={estimatedMinutes}
                      onChange={(e) => {
                        setEstimatedMinutes(e.target.value);
                        scheduleFlush();
                      }}
                      placeholder="—"
                      disabled={blockUi}
                      className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base text-kal-text placeholder:text-kal-muted transition-colors duration-200 disabled:opacity-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-kal-muted">Date</label>
                  <input
                    type="date"
                    value={assignedDate}
                    onChange={(e) => {
                      setAssignedDate(e.target.value);
                      scheduleFlush();
                    }}
                    disabled={blockUi}
                    className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base text-kal-text transition-colors duration-200 disabled:opacity-50"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs text-kal-muted">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  scheduleFlush();
                }}
                disabled={blockUi}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base text-kal-text transition-colors duration-200 disabled:opacity-50"
              >
                <option value={TASK_STATUS.pending}>Pending</option>
                <option value={TASK_STATUS.in_progress}>In progress</option>
                <option value={TASK_STATUS.completed}>Conquered</option>
              </select>
            </div>
          </div>
        ) : null}

        {error && (
          <p className="mt-4 rounded-xl bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-2xl border border-kal-border py-3.5 text-sm font-medium text-kal-text-secondary transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!draftReady || blockUi}
            onClick={handleClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3.5 text-sm font-semibold text-white shadow-sm transition-opacity duration-200 hover:bg-kal-accent-hover disabled:opacity-40"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
