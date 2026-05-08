import type { MotivationLetterRow } from "@/lib/motivationLocal";

/** Server stores full body; strip for UI/cache while sealed before open_date. */
export function sanitizeMotivationLettersForToday(
  letters: MotivationLetterRow[],
  today: string,
): MotivationLetterRow[] {
  return letters.map((l) => redactLetterBeforeOpenDate(l, today));
}

export function redactLetterBeforeOpenDate(
  l: MotivationLetterRow,
  today: string,
): MotivationLetterRow {
  if (isLetterSealedBeforeOpenDate(l, today)) {
    return { ...l, body: "" };
  }
  return l;
}

export function isLetterSealedBeforeOpenDate(
  l: MotivationLetterRow,
  today: string,
): boolean {
  const open = l.open_date?.slice(0, 10) ?? "";
  if (l.sealed !== true || !open) return false;
  return today < open;
}

export function letterRevealStorageKey(userId: string, letterDate: string): string {
  return `kal-motivation-letter-revealed:${userId}:${letterDate.slice(0, 10)}`;
}

export function isLetterRevealedInStorage(
  userId: string,
  letterDate: string,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(letterRevealStorageKey(userId, letterDate)) === "1";
  } catch {
    return false;
  }
}

export function setLetterRevealedInStorage(userId: string, letterDate: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(letterRevealStorageKey(userId, letterDate), "1");
  } catch {
    /* ignore quota */
  }
}

/** Exclude from “Pull a message” while sealed and not yet readable / not yet revealed. */
export function shouldExcludeLetterFromRandomPull(
  l: MotivationLetterRow,
  today: string,
  userId: string,
): boolean {
  if (l.sealed !== true) return false;
  const open = l.open_date?.slice(0, 10) ?? "";
  if (!open) return false;
  if (today < open) return true;
  return !isLetterRevealedInStorage(userId, l.letter_date);
}

export function shouldHideLetterBodyInTimeline(
  l: MotivationLetterRow,
  today: string,
  userId: string,
): boolean {
  if (isLetterSealedBeforeOpenDate(l, today)) return true;
  if (l.sealed === true) {
    const open = l.open_date?.slice(0, 10) ?? "";
    if (open && today >= open && !isLetterRevealedInStorage(userId, l.letter_date)) {
      return true;
    }
  }
  return false;
}
