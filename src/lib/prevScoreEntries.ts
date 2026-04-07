export type PrevScoreEntry = { label: string; score: number };

/** Parse JSONB from user_profiles.prev_score_entries. */
export function parsePrevScoreEntries(raw: unknown): PrevScoreEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PrevScoreEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const scoreRaw = o.score;
    const score =
      typeof scoreRaw === "number"
        ? scoreRaw
        : typeof scoreRaw === "string"
          ? Number(scoreRaw)
          : NaN;
    if (!label || !Number.isFinite(score) || score < 0) continue;
    out.push({ label, score: Math.round(score) });
  }
  return out;
}
