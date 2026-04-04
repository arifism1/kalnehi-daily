"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createTask, updateTask } from "@/actions/tasks";
import {
  chaptersForSubject,
  hasDuplicateMicrotopicOnDate,
} from "@/lib/taskPlanner";
import {
  dbTimeToInputValue,
  inputTimeToDb,
  minutesBetweenTimeInputs,
} from "@/lib/taskTime";
import { refreshTasksFromSupabase } from "@/lib/refreshTasksFromSupabase";
import { dispatchTasksSync } from "@/lib/taskRefreshDispatch";
import { formatSupabaseError } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore, type Task } from "@/store/useTaskStore";

import { TASK_STATUS } from "@/components/task/TaskCard";
import { TaskPlanner } from "@/components/planner/TaskPlanner";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chapters = useMemo(
    () => chaptersForSubject(microtopics, subject),
    [microtopics, subject],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAssignedDate(defaultAssignedDate);
    if (mode === "edit" && task) {
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
      setMarks(
        task.marks_value != null ? String(task.marks_value) : "",
      );
      setSubject(row?.subject ?? "");
      setChapter(row?.chapter ?? "");
      setMicrotopicId(task.microtopic_id ?? "");
      setStatus(task.status);
    } else {
      setTaskName("");
      setFromTime("");
      setToTime("");
      setEstimatedMinutes("");
      setMarks("");
      setSubject("");
      setChapter("");
      setMicrotopicId("");
      setStatus(TASK_STATUS.pending);
    }
  }, [open, mode, task, defaultAssignedDate, syllabusById]);

  useEffect(() => {
    if (!open || mode === "edit") return;
    if (subject && !chapters.includes(chapter)) {
      setChapter(chapters[0] ?? "");
    }
  }, [open, mode, subject, chapter, chapters]);

  const onFromTimeChange = useCallback(
    (v: string) => {
      setFromTime(v);
      const m = minutesBetweenTimeInputs(v, toTime);
      if (m != null) setEstimatedMinutes(String(m));
    },
    [toTime],
  );

  const onToTimeChange = useCallback(
    (v: string) => {
      setToTime(v);
      const m = minutesBetweenTimeInputs(fromTime, v);
      if (m != null) setEstimatedMinutes(String(m));
    },
    [fromTime],
  );

  const submit = useCallback(async () => {
    if (!userId) return;
    const linkId = microtopicId.trim() || null;
    const linkedRow = linkId ? syllabusById[linkId] : undefined;
    const name =
      taskName.trim() || linkedRow?.microtopic?.trim() || "";
    if (!name) {
      setError("Add a task name, or pick a syllabus topic below.");
      return;
    }

    const marksNum = marks.trim() ? Number(marks) : NaN;
    if (marks.trim() && !Number.isFinite(marksNum)) {
      setError("Marks must be a number.");
      return;
    }

    const estRaw = estimatedMinutes.trim();
    const estNum = estRaw ? Number(estRaw) : NaN;
    if (estRaw && (!Number.isFinite(estNum) || estNum < 0)) {
      setError("Estimated minutes must be a non-negative number.");
      return;
    }

    if (
      linkId &&
      hasDuplicateMicrotopicOnDate(
        tasksList,
        linkId,
        assignedDate,
        mode === "edit" ? task?.id : undefined,
      )
    ) {
      setError("You already linked this syllabus topic on that day.");
      return;
    }

    const startDb = inputTimeToDb(fromTime);
    const endDb = inputTimeToDb(toTime);

    setSaving(true);
    setError(null);
    try {
      const payload = {
        assigned_date: assignedDate,
        name,
        microtopic_id: linkId,
        status,
        start_time: startDb,
        end_time: endDb,
        estimated_minutes: Number.isFinite(estNum) ? Math.round(estNum) : null,
        marks_value: Number.isFinite(marksNum) ? marksNum : null,
      };

      if (mode === "add") {
        const res = await createTask(payload);
        if (!res.ok) throw new Error(res.error);
      } else if (task) {
        const res = await updateTask(task.id, payload);
        if (!res.ok) throw new Error(res.error);
      }
      await refreshTasksFromSupabase(userId);
      dispatchTasksSync();
      onClose();
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setSaving(false);
    }
  }, [
    userId,
    taskName,
    marks,
    estimatedMinutes,
    microtopicId,
    syllabusById,
    mode,
    tasksList,
    assignedDate,
    status,
    task,
    fromTime,
    toTime,
    onClose,
  ]);

  if (!open) return null;

  const canSave =
    taskName.trim().length > 0 || microtopicId.trim().length > 0;

  const hasSyllabus = microtopics.length > 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className="relative z-10 max-h-[min(92vh,40rem)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700/90 bg-[#0c1222] p-4 shadow-2xl sm:rounded-2xl sm:p-5"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500">
              Task planner
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">
              {mode === "add" ? "New task" : "Edit task"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-slate-800/80 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="task-name"
              className="text-xs font-medium text-zinc-500"
            >
              Task name
            </label>
            <textarea
              id="task-name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              rows={4}
              placeholder="What do you want to get done?"
              className="mt-2 min-h-[7.5rem] w-full resize-y rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-base leading-relaxed text-white placeholder:text-zinc-600 transition-colors duration-200 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500">From (optional)</label>
              <input
                type="time"
                value={fromTime}
                onChange={(e) => onFromTimeChange(e.target.value)}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-base text-white transition-colors duration-200"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">To (optional)</label>
              <input
                type="time"
                value={toTime}
                onChange={(e) => onToTimeChange(e.target.value)}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-base text-white transition-colors duration-200"
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-zinc-600">
            Filling both times fills estimated minutes automatically.
          </p>

          <div>
            <label className="text-xs text-zinc-500">Marks (optional)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              placeholder="—"
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-base text-white placeholder:text-zinc-600 transition-colors duration-200"
            />
          </div>

          {hasSyllabus ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">
                Syllabus &amp; schedule
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
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
                  }}
                  onChapterChange={(c) => {
                    setChapter(c);
                    setMicrotopicId("");
                  }}
                  onMicrotopicIdChange={setMicrotopicId}
                  onAssignedDateChange={setAssignedDate}
                  onEstimatedMinutesChange={setEstimatedMinutes}
                  excludeTaskId={mode === "edit" ? task?.id : undefined}
                  disabled={saving}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500">
                    Est. minutes (optional)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    placeholder="—"
                    className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-base text-white placeholder:text-zinc-600 transition-colors duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Date</label>
                <input
                  type="date"
                  value={assignedDate}
                  onChange={(e) => setAssignedDate(e.target.value)}
                  className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-base text-white transition-colors duration-200"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-zinc-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-base text-white transition-colors duration-200"
            >
              <option value={TASK_STATUS.pending}>Pending</option>
              <option value={TASK_STATUS.in_progress}>In progress</option>
              <option value={TASK_STATUS.completed}>Conquered</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-700 py-3.5 text-sm font-medium text-zinc-300 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !canSave}
            onClick={() => void submit()}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition-opacity duration-200 disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
