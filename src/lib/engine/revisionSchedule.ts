import { addDays, format, parseISO } from "date-fns";

export type RevisionDifficulty = "hard" | "medium" | "easy";

export type RevisionItem = {
  id: string;
  title: string;
  microtopicId?: string;
  difficulty: RevisionDifficulty;
  nextDue: string;
  lastReviewed: string | null;
  createdAt: string;
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
