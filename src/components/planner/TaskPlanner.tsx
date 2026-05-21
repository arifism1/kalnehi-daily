"use client";

import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import { useId, useMemo } from "react";

import {
  chaptersForSubject,
  hasDuplicateMicrotopicOnDate,
  isDayLoadOverNineHours,
  microtopicsForSubjectChapter,
  sumEstimatedTimeForDate,
  uniqueSubjects,
} from "@/lib/taskPlanner";
import type { Microtopic, Task } from "@/store/useTaskStore";

export type TaskPlannerProps = {
  microtopics: Microtopic[];
  tasks: Task[];
  subject: string;
  chapter: string;
  microtopicId: string;
  assignedDate: string;
  estimatedMinutes: string;
  onSubjectChange: (subject: string) => void;
  onChapterChange: (chapter: string) => void;
  onMicrotopicIdChange: (id: string) => void;
  onAssignedDateChange: (date: string) => void;
  onEstimatedMinutesChange: (value: string) => void;
  /** When editing, exclude this task from duplicate detection */
  excludeTaskId?: string;
  disabled?: boolean;
};

/**
 * Subject → Chapter → Microtopic → Date, with 9h soft warning and duplicate guard.
 */
export function TaskPlanner({
  microtopics,
  tasks,
  subject,
  chapter,
  microtopicId,
  assignedDate,
  estimatedMinutes,
  onSubjectChange,
  onChapterChange,
  onMicrotopicIdChange,
  onAssignedDateChange,
  onEstimatedMinutesChange,
  excludeTaskId,
  disabled = false,
}: TaskPlannerProps) {
  const uid = useId();
  const subjects = useMemo(
    () => uniqueSubjects(microtopics),
    [microtopics],
  );
  const chapters = useMemo(
    () => chaptersForSubject(microtopics, subject),
    [microtopics, subject],
  );
  const microtopicOptions = useMemo(
    () => microtopicsForSubjectChapter(microtopics, subject, chapter),
    [microtopics, subject, chapter],
  );

  const estNum = estimatedMinutes.trim() ? Number(estimatedMinutes) : 0;
  const proposedMinutes = Number.isFinite(estNum) && estNum > 0 ? estNum : 0;

  const dayLoadExisting = useMemo(
    () => sumEstimatedTimeForDate(tasks, assignedDate),
    [tasks, assignedDate],
  );

  const overNineHours = useMemo(
    () =>
      isDayLoadOverNineHours(tasks, assignedDate, proposedMinutes) &&
      proposedMinutes > 0,
    [tasks, assignedDate, proposedMinutes],
  );

  const duplicateMicrotopic =
    microtopicId.trim() !== "" &&
    hasDuplicateMicrotopicOnDate(
      tasks,
      microtopicId.trim(),
      assignedDate,
      excludeTaskId,
    );

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${uid}-subject`} className="text-xs font-medium text-kal-muted">Subject</label>
          {subject ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => { onSubjectChange(""); onChapterChange(""); onMicrotopicIdChange(""); }}
              className="text-[11px] font-medium text-kal-muted hover:text-kal-text disabled:opacity-40"
            >
              Clear
            </button>
          ) : null}
        </div>
        <select
          id={`${uid}-subject`}
          value={subject}
          disabled={disabled || microtopics.length === 0}
          onChange={(e) => {
            onSubjectChange(e.target.value);
            onChapterChange("");
            onMicrotopicIdChange("");
          }}
          className="mt-1.5 w-full min-h-[48px] rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base sm:text-sm text-kal-text transition-colors duration-200"
        >
          <option value="">— Select subject —</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${uid}-chapter`} className="text-xs font-medium text-kal-muted">Chapter</label>
          {chapter ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => { onChapterChange(""); onMicrotopicIdChange(""); }}
              className="text-[11px] font-medium text-kal-muted hover:text-kal-text disabled:opacity-40"
            >
              Clear
            </button>
          ) : null}
        </div>
        <select
          id={`${uid}-chapter`}
          value={chapter}
          disabled={disabled || !subject}
          onChange={(e) => {
            onChapterChange(e.target.value);
            onMicrotopicIdChange("");
          }}
          className="mt-1.5 w-full min-h-[48px] rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base sm:text-sm text-kal-text transition-colors duration-200"
        >
          <option value="">— Select chapter —</option>
          {chapters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${uid}-microtopic`} className="text-xs font-medium text-kal-muted">Microtopic</label>
          {microtopicId ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onMicrotopicIdChange("")}
              className="text-[11px] font-medium text-kal-muted hover:text-kal-text disabled:opacity-40"
            >
              Clear
            </button>
          ) : null}
        </div>
        <select
          id={`${uid}-microtopic`}
          value={microtopicId}
          disabled={disabled || !chapter}
          onChange={(e) => onMicrotopicIdChange(e.target.value)}
          className={clsx(
            "mt-1.5 w-full min-h-[48px] rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base sm:text-sm text-kal-text transition-colors duration-200",
            duplicateMicrotopic
              ? "border-amber-500/60"
              : "border-kal-border",
          )}
        >
          <option value="">— Select microtopic —</option>
          {microtopicOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.microtopic}
            </option>
          ))}
        </select>
        {duplicateMicrotopic && (
          <p className="mt-1.5 text-xs font-medium text-amber-300">
            You already have this microtopic on the same day. Pick another or
            change the date.
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${uid}-date`} className="text-xs font-medium text-kal-muted">Assigned date</label>
        <input
          id={`${uid}-date`}
          type="date"
          value={assignedDate}
          disabled={disabled}
          onChange={(e) => onAssignedDateChange(e.target.value)}
          className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base text-kal-text transition-colors duration-200"
        />
      </div>

      <div>
        <label htmlFor={`${uid}-estmin`} className="text-xs font-medium text-kal-muted">
          Est. minutes (optional)
        </label>
        <input
          id={`${uid}-estmin`}
          type="number"
          inputMode="numeric"
          min={0}
          value={estimatedMinutes}
          disabled={disabled}
          onChange={(e) => onEstimatedMinutesChange(e.target.value)}
          placeholder="—"
          className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-base text-kal-text transition-colors duration-200"
        />
        <p className="mt-1 text-[11px] tabular-nums text-kal-text-secondary">
          Day load (this date): {Math.floor(dayLoadExisting / 60)}h{" "}
          {dayLoadExisting % 60}m scheduled
          {proposedMinutes > 0 && (
            <>
              {" "}
              + {proposedMinutes}m new
            </>
          )}
        </p>
      </div>

      {overNineHours && (
        <div
          role="status"
          className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2.5 text-sm text-amber-100"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <p>
            Soft warning: this day already has a heavy load. Adding this task
            pushes estimated time over <strong>9 hours</strong> — consider
            spreading work.
          </p>
        </div>
      )}
    </div>
  );
}
