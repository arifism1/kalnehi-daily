import type { Microtopic, Task } from "@/store/useTaskStore";

export function uniqueSubjects(microtopics: Microtopic[]): string[] {
  const set = new Set(
    microtopics.flatMap((m) => (m.subject.trim() ? [m.subject.trim()] : [])),
  );
  return [...set].toSorted((a, b) => a.localeCompare(b));
}

export function chaptersForSubject(
  microtopics: Microtopic[],
  subject: string,
): string[] {
  const set = new Set(
    microtopics.flatMap((m) => {
      if (m.subject !== subject) return [];
      const chapter = m.chapter.trim();
      return chapter ? [chapter] : [];
    }),
  );
  return [...set].toSorted((a, b) => a.localeCompare(b));
}

export function microtopicsForSubjectChapter(
  microtopics: Microtopic[],
  subject: string,
  chapter: string,
): Microtopic[] {
  return microtopics
    .filter((m) => m.subject === subject && m.chapter === chapter)
    .sort((a, b) => a.microtopic.localeCompare(b.microtopic));
}

export function hasDuplicateMicrotopicOnDate(
  tasks: {
    id: string;
    assigned_date: string;
    microtopic_id: string | null;
  }[],
  microtopicId: string,
  assignedDate: string,
  excludeTaskId?: string,
): boolean {
  return tasks.some(
    (t) =>
      t.microtopic_id === microtopicId &&
      t.assigned_date === assignedDate &&
      (!excludeTaskId || t.id !== excludeTaskId),
  );
}

const NINE_HOURS_MINUTES = 9 * 60;

/** Sum of estimated minutes for tasks on a calendar day (both DB columns). */
export function sumEstimatedTimeForDate(tasks: Task[], calendarDate: string): number {
  let s = 0;
  for (const t of tasks) {
    if (t.assigned_date !== calendarDate) continue;
    s += t.estimated_time_minutes ?? 0;
  }
  return s;
}

/** Soft overload: existing day load + proposed new minutes exceeds 9 hours. */
export function isDayLoadOverNineHours(
  tasks: Task[],
  calendarDate: string,
  additionalMinutes: number,
): boolean {
  return sumEstimatedTimeForDate(tasks, calendarDate) + additionalMinutes > NINE_HOURS_MINUTES;
}
