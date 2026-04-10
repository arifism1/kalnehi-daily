import { normalizeVoiceHHMM } from "@/lib/voiceIst";

import { timeDbToInput } from "@/lib/dailyPlanTime";

export function normalizeTitleForCompare(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s]/gi, "");
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeTitleForCompare(s).split(" ").filter(Boolean));
}

/** Jaccard similarity on word tokens, 0..1 */
export function titleSimilarity(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) {
    if (B.has(t)) inter++;
  }
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function sameTimeSlot(
  aStart: string | null,
  aEnd: string | null,
  bStart: string | null,
  bEnd: string | null,
): boolean {
  const na = normalizeVoiceHHMM(
    aStart ? timeDbToInput(aStart) : null,
  );
  const nb = normalizeVoiceHHMM(
    bStart ? timeDbToInput(bStart) : null,
  );
  if (!na || !nb || na !== nb) return false;
  const ea = aEnd ? normalizeVoiceHHMM(timeDbToInput(aEnd)) : null;
  const eb = bEnd ? normalizeVoiceHHMM(timeDbToInput(bEnd)) : null;
  if (ea == null && eb == null) return true;
  return ea != null && eb != null && ea === eb;
}

export type SimilarityCandidate = {
  id: string;
  title: string;
  time_start: string | null;
  time_end: string | null;
};

/**
 * Heuristic pre-filter before Groq: same start time and decent title overlap.
 */
export function pickGroqSimilarityCandidate(
  newTitle: string,
  newStartInput: string,
  newEndInput: string,
  existing: SimilarityCandidate[],
): SimilarityCandidate | null {
  const nStart = normalizeVoiceHHMM(newStartInput.trim() || null);
  const nEnd = normalizeVoiceHHMM(newEndInput.trim() || null);
  let best: SimilarityCandidate | null = null;
  let bestScore = 0;
  for (const e of existing) {
    const es = e.time_start
      ? normalizeVoiceHHMM(timeDbToInput(e.time_start))
      : null;
    const ee = e.time_end
      ? normalizeVoiceHHMM(timeDbToInput(e.time_end))
      : null;
    if (!nStart || !es || nStart !== es) continue;
    if ((nEnd || null) !== (ee || null)) continue;
    const sim = titleSimilarity(newTitle, e.title);
    if (sim >= 0.35 && sim > bestScore) {
      bestScore = sim;
      best = e;
    }
  }
  return best;
}
