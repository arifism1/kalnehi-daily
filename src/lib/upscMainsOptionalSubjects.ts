export const UPSC_CSE_MAINS_EXAM_NAME = "UPSC CSE Mains";

/**
 * UPSC CSE Mains total = 2350 (1750 merit + 600 qualifying). Qualifying marks are included
 * in the syllabus rollup numerator (`totalMarksMastered`). The UI uses this fixed value
 * as the denominator for “marks secured” and headline % when the catalog chapter-weight
 * sum (`rollup.totalMarksPool`) differs from 2350.
 */
export const UPSC_CSE_MAINS_UI_TOTAL_MARKS = 2350;

/** Headline % for Syllabus Tracker / related UI: mastered ÷ 2350 (cap 100%). */
export function upscMainsSyllabusUiPercent(totalMarksMastered: number): number {
  const d = UPSC_CSE_MAINS_UI_TOTAL_MARKS;
  if (d <= 0) return 0;
  return Math.min(100, Math.round((totalMarksMastered / d) * 1000) / 10);
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export function isUpscCseMainsExam(exam: string | null | undefined): boolean {
  if (!exam) return false;
  return normalizeLabel(exam) === normalizeLabel(UPSC_CSE_MAINS_EXAM_NAME);
}

function matchesUpscQualifyingPaperName(normalized: string): boolean {
  return (
    normalized.includes("qualifying") ||
    normalized.includes("paper a") ||
    normalized.includes("paper b") ||
    normalized.includes("indian language") ||
    normalized.includes("english")
  );
}

function isUpscMainsCommonSubject(subject: string): boolean {
  const normalized = normalizeLabel(subject);
  if (!normalized) return false;
  // Optional papers are matched separately; never treat as common.
  if (normalized.includes("(optional)")) return false;
  if (normalized === "essay" || normalized.includes("essay paper")) return true;
  if (normalized.startsWith("general studies")) return true;
  if (matchesUpscQualifyingPaperName(normalized)) return true;
  return false;
}

/**
 * English / Indian Language / Paper A–B / Qualifying labels only (not Essay or GS).
 * For UPSC Mains UI hints; rollup already includes these when rows are loaded.
 */
export function isUpscMainsQualifyingPaperSubject(subject: string): boolean {
  const normalized = normalizeLabel(subject);
  if (!normalized || normalized.includes("(optional)")) return false;
  if (normalized === "essay" || normalized.includes("essay paper")) return false;
  if (normalized.startsWith("general studies")) return false;
  return matchesUpscQualifyingPaperName(normalized);
}

/**
 * Strips paper-number suffixes from optional subject names so both papers
 * collapse to a single base name in the picker dropdown.
 *
 * Examples:
 *   "Anthropology (Optional) - Paper I"  → "Anthropology"
 *   "Anthropology (Optional) - Paper II" → "Anthropology"
 *   "PSIR Paper I"                        → "PSIR"
 *   "Geography"                           → "Geography"  (no-op)
 */
function extractOptionalBaseLabel(subject: string): string {
  const clean = subject.trim();

  // "Anthropology (Optional) - Paper I/II/…"
  const mWithOptional = clean.match(
    /^(.+?)\s*\(optional\)\s*[-–]\s*paper\s+[IVXivx\d]+\s*$/i,
  );
  if (mWithOptional) return mWithOptional[1].trim();

  // "Anthropology Paper I/II/…"  (without "(Optional)" qualifier)
  const mWithPaper = clean.match(/^(.+?)\s+paper\s+[IVXivx\d]+\s*$/i);
  if (mWithPaper) return mWithPaper[1].trim();

  return clean;
}

/**
 * Returns the sorted list of unique optional-subject base names derived from
 * the syllabus_master subjects for UPSC CSE Mains (common papers excluded).
 * Both "Anthropology (Optional) - Paper I" and "…Paper II" collapse to
 * a single "Anthropology" entry.
 */
export function deriveUpscOptionalSubjects(subjects: string[]): string[] {
  const unique = new Map<string, string>();
  for (const subject of subjects) {
    const clean = subject.trim();
    if (!clean) continue;
    if (isUpscMainsCommonSubject(clean)) continue;
    const base = extractOptionalBaseLabel(clean);
    const key = normalizeLabel(base);
    if (!unique.has(key)) unique.set(key, base);
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b));
}

export function parseTextArrayJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const clean = item.trim();
    if (!clean) continue;
    const key = normalizeLabel(clean);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

/**
 * Determines whether a syllabus_master row should be visible given the user's
 * selected optional subject (single choice, or null for none).
 *
 * Common papers (Essay, GS I–IV, Qualifying Papers) are always kept.
 * Optional-subject rows are kept when their base label matches the selected
 * base label — so both Paper I and Paper II of "Anthropology" are included
 * when "Anthropology" is selected.
 */
export function shouldKeepUpscMainsRow(params: {
  subject: string;
  selectedOptional: string | null;
}): boolean {
  const cleanSubject = params.subject.trim();
  if (!cleanSubject) return false;
  if (isUpscMainsCommonSubject(cleanSubject)) return true;
  if (!params.selectedOptional?.trim()) return false;

  const subjectBase = normalizeLabel(extractOptionalBaseLabel(cleanSubject));
  const selBase = normalizeLabel(extractOptionalBaseLabel(params.selectedOptional));
  return subjectBase === selBase;
}
