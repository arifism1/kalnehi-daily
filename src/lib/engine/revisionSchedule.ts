import { addDays, format, parseISO } from "date-fns";

export type RevisionDifficulty = "hard" | "medium" | "easy";

/** Workflow for revision reminders (distinct from spaced-repetition "log" UX). */
export type RevisionReminderStatus = "pending" | "done" | "archived";

/** `manual` = student-created; `suggested` reserved for PrepBrain / smart inserts. */
export type RevisionReminderSource = "manual" | "suggested";

export type RevisionItem = {
  id: string;
  title: string;
  microtopicId?: string;
  difficulty: RevisionDifficulty;
  nextDue: string;
  lastReviewed: string | null;
  createdAt: string;
  notes: string;
  status: RevisionReminderStatus;
  reminderSource: RevisionReminderSource;
};

/** Legacy localStorage key (one-time import into Supabase-backed IDB). */
export const REVISION_LEGACY_STORAGE_KEY = "kalnehi-revision-v1";

const OFFSETS: Record<RevisionDifficulty, number> = {
  hard: 1,
  medium: 3,
  easy: 7,
};

export function nextDueFrom(
  fromDate: string,
  difficulty: RevisionDifficulty,
): string {
  const d = parseISO(fromDate);
  return format(addDays(d, OFFSETS[difficulty]), "yyyy-MM-dd");
}

export function buildNewRevisionItem(
  title: string,
  difficulty: RevisionDifficulty,
  microtopicId?: string,
): RevisionItem {
  const today = format(new Date(), "yyyy-MM-dd");
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `rev-${Date.now()}`;
  return {
    id,
    title: title.trim() || "Revision",
    microtopicId,
    difficulty,
    nextDue: nextDueFrom(today, difficulty),
    lastReviewed: null,
    createdAt: new Date().toISOString(),
    notes: "",
    status: "pending",
    reminderSource: "manual",
  };
}

export type BuildRevisionReminderInput = {
  title: string;
  difficulty: RevisionDifficulty;
  /** Calendar date `yyyy-MM-dd`; default should be today + 7 from caller. */
  nextDue: string;
  microtopicId?: string;
  notes?: string;
  status?: RevisionReminderStatus;
  reminderSource?: RevisionReminderSource;
};

/**
 * Student-controlled revision reminder: due date is explicit (not derived from difficulty).
 */
export function buildRevisionReminderItem(
  input: BuildRevisionReminderInput,
): RevisionItem {
  const due = input.nextDue.trim();
  const safeDue = /^\d{4}-\d{2}-\d{2}$/.test(due)
    ? due
    : format(addDays(new Date(), 7), "yyyy-MM-dd");
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `rev-${Date.now()}`;
  const rawNotes = (input.notes ?? "").trim();
  return {
    id,
    title: input.title.trim() || "Revision",
    microtopicId: input.microtopicId,
    difficulty: input.difficulty,
    nextDue: safeDue,
    lastReviewed: null,
    createdAt: new Date().toISOString(),
    notes: rawNotes.slice(0, 5000),
    status: input.status ?? "pending",
    reminderSource: input.reminderSource ?? "manual",
  };
}

export function applyLoggedRevision(
  item: RevisionItem,
  today: string,
): RevisionItem {
  return {
    ...item,
    lastReviewed: today,
    nextDue: nextDueFrom(today, item.difficulty),
  };
}

/** Mark reminder done without advancing next due (student owns the date). */
export function markRevisionReminderDone(
  item: RevisionItem,
  todayYyyyMmDd: string,
): RevisionItem {
  return {
    ...item,
    status: "done",
    lastReviewed: todayYyyyMmDd,
  };
}

export function dueAndUpcoming(
  items: RevisionItem[],
  today: string,
): { due: RevisionItem[]; upcoming: RevisionItem[] } {
  const due: RevisionItem[] = [];
  const upcoming: RevisionItem[] = [];
  for (const it of items) {
    if (it.nextDue <= today) due.push(it);
    else upcoming.push(it);
  }
  due.sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  upcoming.sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  return { due, upcoming };
}
