import type { Microtopic } from "@/store/useTaskStore";

const STOP = new Set([
  "the",
  "a",
  "an",
  "for",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "at",
  "my",
  "pm",
  "am",
  "hrs",
  "hr",
  "min",
  "minutes",
]);

/**
 * Best-effort match from free-text task title to a syllabus microtopic row.
 * Returns null when confidence is low.
 */
export function suggestSyllabusIdFromTitle(
  title: string,
  microtopics: Microtopic[],
): string | null {
  const t = title.trim().toLowerCase();
  if (!t || microtopics.length === 0) return null;

  const tokens = t.split(/\s+/).flatMap((w) => {
    const normalized = w.replace(/[^a-z0-9]/gi, "").toLowerCase();
    return normalized.length > 2 && !STOP.has(normalized) ? [normalized] : [];
  });

  let best: { id: string; score: number } | null = null;

  for (const m of microtopics) {
    const micro = m.microtopic.trim().toLowerCase();
    const chap = m.chapter.trim().toLowerCase();
    const subj = m.subject.trim().toLowerCase();
    let score = 0;

    for (const tok of tokens) {
      if (micro.includes(tok)) score += 3;
      if (chap.includes(tok)) score += 1;
      if (subj.includes(tok)) score += 1;
    }

    if (micro.length >= 4 && (t.includes(micro) || micro.includes(t.slice(0, 24)))) {
      score += 4;
    }

    if (best === null || score > best.score) {
      best = { id: m.id, score };
    }
  }

  if (!best || best.score < 4) return null;
  return best.id;
}
