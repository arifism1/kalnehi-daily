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

const STORAGE_KEY = "kalnehi-revision-v1";

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

export function loadRevisionItems(): RevisionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RevisionItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRevisionItems(items: RevisionItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addRevisionItem(
  title: string,
  difficulty: RevisionDifficulty,
  microtopicId?: string,
): RevisionItem {
  const today = format(new Date(), "yyyy-MM-dd");
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `rev-${Date.now()}`;
  const item: RevisionItem = {
    id,
    title: title.trim() || "Revision",
    microtopicId,
    difficulty,
    nextDue: nextDueFrom(today, difficulty),
    lastReviewed: null,
    createdAt: new Date().toISOString(),
  };
  const all = loadRevisionItems();
  all.push(item);
  saveRevisionItems(all);
  return item;
}

export function completeRevisionReview(id: string): void {
  const today = format(new Date(), "yyyy-MM-dd");
  const all = loadRevisionItems();
  const i = all.findIndex((x) => x.id === id);
  if (i < 0) return;
  const row = all[i]!;
  row.lastReviewed = today;
  row.nextDue = nextDueFrom(today, row.difficulty);
  all[i] = row;
  saveRevisionItems(all);
}

export function removeRevisionItem(id: string): void {
  saveRevisionItems(loadRevisionItems().filter((x) => x.id !== id));
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
