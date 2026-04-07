import { CUET_MARKS_PER_SUBJECT } from "@/lib/examProfile";
import type { SyllabusMarksRow } from "@/lib/syllabusConstants";
import {
  isMicrotopicProgressStatus,
  syllabusMarksWeight,
  syllabusMarksWeightForYear,
  type MicrotopicProgressStatus,
} from "@/lib/syllabusConstants";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import {
  compareChapterNames,
  sortSubjects,
  type SyllabusRow,
} from "@/lib/syllabusGrouping";

export type { SyllabusRow };

/** Default exam year for overall mastery, Reality Snapshot, and chapter labels. */
export const NEET_PRIMARY_YEAR = 2025;

const PROJECTION_YEARS = [2025, 2024, 2023] as const;

/**
 * Chapter-level NEET weight: one value per chapter (deduped vs split weights).
 * Marks are awarded only when every microtopic in the chapter is `completed`.
 */
export type ChapterRollup = {
  subject: string;
  chapter: string;
  totalCount: number;
  /** Microtopics with status === completed */
  completedCount: number;
  /** Share of microtopics done (for progress bar toward chapter lock-in). */
  microtopicProgressPercent: number;
  /** Chapter pool weight (primary year when available). */
  chapterMarksTotal: number;
  /** Full chapter weight or 0 if any microtopic not completed. */
  chapterMarksAwarded: number;
  isChapterMastered: boolean;
};

export type SyllabusRollup = {
  /** Weighted % of chapter marks pool captured (chapter-all-or-nothing). */
  overallPercent: number;
  totalMarksMastered: number;
  totalMarksPool: number;
  chapters: ChapterRollup[];
};

export type NeetYearProjection = {
  year: number;
  totalMarksPool: number;
  totalMarksMastered: number;
  /** Completion rate mapped to NEET scale (max 720). */
  projectedOutOf720: number;
  patternLabel: string;
  completionNote: string;
};

/** Per exam year — projection on 720 scale (for Home / Progress / Reality Snapshot). */
export type SyllabusYearMarkLine = {
  year: number;
  projectedOutOf720: number;
  patternShort: string;
};

export type SyllabusMultiYearCapture = {
  ringPercent: number;
  ringYear: number;
  ringProjected: number;
  ringOutOf: number;
  lines: SyllabusYearMarkLine[];
};

/** Per-domain subject summary (e.g. CUET) from chapter rollups. */
export type SubjectRollupSummary = {
  subject: string;
  overallPercent: number;
  totalMarksMastered: number;
  totalMarksPool: number;
};

export function aggregateRollupBySubject(
  rollup: SyllabusRollup,
): SubjectRollupSummary[] {
  const bySubject = new Map<string, { mastered: number; pool: number }>();
  for (const ch of rollup.chapters) {
    const s = ch.subject;
    const prev = bySubject.get(s) ?? { mastered: 0, pool: 0 };
    prev.mastered += ch.chapterMarksAwarded;
    prev.pool += ch.chapterMarksTotal;
    bySubject.set(s, prev);
  }
  const out: SubjectRollupSummary[] = [];
  for (const [subject, { mastered, pool }] of bySubject) {
    out.push({
      subject,
      overallPercent:
        pool > 0 ? Math.round((mastered / pool) * 1000) / 10 : 0,
      totalMarksMastered: mastered,
      totalMarksPool: pool,
    });
  }
  return out.sort((a, b) => sortSubjects(a.subject, b.subject));
}

/**
 * Primary ring uses **2025** when that year has weights; else first available year.
 * Lines list every year with data (2025, 2024, 2023).
 */
export function buildSyllabusMultiYearCapture(
  projections: NeetYearProjection[],
  maxScore: number = 720,
  /** Prefer this calendar year’s column for the main ring (e.g. 2025 for NEET / JEE Main 2025). */
  preferRingYear?: number,
): SyllabusMultiYearCapture | null {
  if (projections.length === 0) return null;
  const primary =
    (preferRingYear != null
      ? projections.find((p) => p.year === preferRingYear)
      : undefined) ??
    projections.find((p) => p.year === NEET_PRIMARY_YEAR) ??
    projections[0];
  const ringPercent =
    primary.totalMarksPool > 0
      ? Math.min(
          100,
          Math.round(
            (primary.totalMarksMastered / primary.totalMarksPool) * 1000,
          ) / 10,
        )
      : 0;
  return {
    ringPercent,
    ringYear: primary.year,
    ringProjected: primary.projectedOutOf720,
    ringOutOf: maxScore,
    lines: projections.map((p) => ({
      year: p.year,
      projectedOutOf720: p.projectedOutOf720,
      patternShort: `Based on ${p.year} pattern`,
    })),
  };
}

function resolveStatus(
  syllabusMasterId: string,
  map: Record<string, string>,
): MicrotopicProgressStatus {
  const raw = map[normalizeSyllabusMasterId(syllabusMasterId)];
  if (raw && isMicrotopicProgressStatus(raw)) return raw;
  return "not_begun";
}

function normCuetSubjectLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * CUET scoring: each selected domain = 200 marks max. Per subject, projected marks =
 * (completed microtopics / total microtopics) × 200. No NEET-style chapter pool.
 */
export type CuetSubjectScoring = {
  subject: string;
  completedMicrotopics: number;
  totalMicrotopics: number;
  /** 0–100 from microtopic completion only */
  completionPercent: number;
  projectedMarks: number;
  maxPerSubject: number;
};

export type CuetScoringRollup = {
  subjects: CuetSubjectScoring[];
  totalProjected: number;
  totalMax: number;
  /** totalProjected / totalMax × 100 (cap 100) */
  overallPercent: number;
};

export function computeCuetScoringRollup(
  rows: SyllabusRow[],
  statusBySyllabusMasterId: Record<string, string>,
  domainSubjectsOrdered: string[],
  marksPerSubject: number = CUET_MARKS_PER_SUBJECT,
): CuetScoringRollup | null {
  if (domainSubjectsOrdered.length === 0) return null;

  const subjects: CuetSubjectScoring[] = [];
  let totalProjected = 0;

  for (const domain of domainSubjectsOrdered) {
    const dn = normCuetSubjectLabel(domain);
    const list = rows.filter(
      (r) => normCuetSubjectLabel(r.subject || "") === dn,
    );
    const totalMicrotopics = list.length;
    let completedMicrotopics = 0;
    for (const r of list) {
      if (resolveStatus(r.id, statusBySyllabusMasterId) === "completed") {
        completedMicrotopics++;
      }
    }
    const completionPercent =
      totalMicrotopics > 0
        ? Math.round((completedMicrotopics / totalMicrotopics) * 1000) / 10
        : 0;
    const projectedMarks =
      totalMicrotopics > 0
        ? Math.round((completedMicrotopics / totalMicrotopics) * marksPerSubject)
        : 0;
    totalProjected += projectedMarks;
    subjects.push({
      subject: domain,
      completedMicrotopics,
      totalMicrotopics,
      completionPercent,
      projectedMarks,
      maxPerSubject: marksPerSubject,
    });
  }

  const totalMax = domainSubjectsOrdered.length * marksPerSubject;
  const overallPercent =
    totalMax > 0
      ? Math.min(
          100,
          Math.round((totalProjected / totalMax) * 1000) / 10,
        )
      : 0;

  return {
    subjects,
    totalProjected,
    totalMax,
    overallPercent,
  };
}

function dataHasPositiveYear(rows: SyllabusRow[], year: number): boolean {
  return rows.some((r) => syllabusMarksWeightForYear(r, year) > 0);
}

/**
 * True when the merged syllabus has **real** chapter-weight columns (any year &gt; 0).
 * If all years are null/0, rollups still use a legacy “1 per row” fallback — UI should
 * not show marks-year labels or fake “chapter pool” totals.
 */
export function syllabusHasCatalogMarksData(
  rows: Pick<SyllabusRow, "marks_2025" | "marks_2024" | "marks_2023">[],
): boolean {
  return rows.some((r) =>
    [r.marks_2025, r.marks_2024, r.marks_2023].some(
      (m) => m != null && Number(m) > 0,
    ),
  );
}

/**
 * One chapter’s marks pool for a given year: **never** sum raw microtopic rows
 * into a bogus global total. Each chapter contributes a **single** weight:
 * - If every row has the **same** positive weight → treat as duplicated chapter
 *   total on each row → use that value once.
 * - Otherwise → weights are splits across microtopics → **sum** (they add up
 *   to the chapter’s allocation).
 */
export function chapterMarksPoolForYearRows(
  list: SyllabusMarksRow[],
  year: number,
): number {
  const ws = list
    .map((r) => syllabusMarksWeightForYear(r, year))
    .filter((w) => w > 0);
  if (ws.length === 0) return 0;
  const maxW = Math.max(...ws);
  const sumW = ws.reduce((a, b) => a + b, 0);
  if (ws.every((w) => w === maxW)) return maxW;
  return sumW;
}

/** Legacy: per-row weight like `syllabusMarksWeight` (default 1), then one chapter pool. */
function chapterPoolFromLegacyMixedYearRows(list: SyllabusRow[]): number {
  const ws = list.map((r) => syllabusMarksWeight(r));
  if (ws.length === 0) return 0;
  const maxW = Math.max(...ws);
  const sumW = ws.reduce((a, b) => a + b, 0);
  if (ws.every((w) => w === maxW)) return maxW;
  return sumW;
}

/** Chapter pool for primary rollup: prefer the user’s primary marks year when data exists. */
function chapterWeightPrimary(
  list: SyllabusRow[],
  hasPrimaryYearData: boolean,
  primaryMarksYear: number,
): number {
  if (hasPrimaryYearData) {
    const w = chapterMarksPoolForYearRows(list, primaryMarksYear);
    if (w > 0) return w;
  }
  return chapterPoolFromLegacyMixedYearRows(list);
}

export function buildChapterBuckets(rows: SyllabusRow[]) {
  const chapterBuckets = new Map<string, SyllabusRow[]>();
  for (const row of rows) {
    const sub = row.subject || "Other";
    const ch = row.chapter || "General";
    const key = `${sub}\u0000${ch}`;
    if (!chapterBuckets.has(key)) chapterBuckets.set(key, []);
    chapterBuckets.get(key)!.push(row);
  }
  return chapterBuckets;
}

function labelsForYear(year: number): {
  patternLabel: string;
  completionNote: string;
} {
  if (year === 2025) {
    return {
      patternLabel: "Based on 2025 exam pattern",
      completionNote: "Projected based on your current completion",
    };
  }
  if (year === 2024) {
    return {
      patternLabel: "Based on 2024 exam pattern",
      completionNote: "Projected based on your current completion",
    };
  }
  if (year === 2023) {
    return {
      patternLabel: "Uses 2023 chapter weights",
      completionNote:
        "Syllabus may have changed slightly since 2023 · Projected based on your current completion",
    };
  }
  return {
    patternLabel: `Chapter weights for ${year}`,
    completionNote: "Projected based on your current completion",
  };
}

/**
 * Chapter-based mastery: a chapter contributes its full weight only if
 * **every** microtopic under it has status `completed`. Primary pool uses
 * the `marks_20xx` column for `primaryMarksYear` (from the user’s target exam).
 */
export function computeSyllabusRollup(
  rows: SyllabusRow[],
  statusBySyllabusMasterId: Record<string, string>,
  primaryMarksYear: number = NEET_PRIMARY_YEAR,
): SyllabusRollup {
  const hasPrimaryYearData = dataHasPositiveYear(rows, primaryMarksYear);
  const chapterBuckets = buildChapterBuckets(rows);

  let totalMarksPool = 0;
  let totalMarksMastered = 0;
  const chapters: ChapterRollup[] = [];

  for (const [key, list] of chapterBuckets) {
    const [subject, chapter] = key.split("\u0000");
    const chapterWeight = chapterWeightPrimary(
      list,
      hasPrimaryYearData,
      primaryMarksYear,
    );

    let completedCount = 0;
    for (const row of list) {
      const st = resolveStatus(row.id, statusBySyllabusMasterId);
      if (st === "completed") completedCount++;
    }

    const totalCount = list.length;
    const allMicrotopicsCompleted =
      totalCount > 0 && completedCount === totalCount;
    const chapterMarksAwarded = allMicrotopicsCompleted ? chapterWeight : 0;

    totalMarksPool += chapterWeight;
    totalMarksMastered += chapterMarksAwarded;

    chapters.push({
      subject,
      chapter,
      totalCount,
      completedCount,
      microtopicProgressPercent:
        totalCount > 0
          ? Math.round((completedCount / totalCount) * 1000) / 10
          : 0,
      chapterMarksTotal: chapterWeight,
      chapterMarksAwarded,
      isChapterMastered: allMicrotopicsCompleted,
    });
  }

  chapters.sort((a, b) => {
    const s = sortSubjects(a.subject, b.subject);
    if (s !== 0) return s;
    return compareChapterNames(a.chapter, b.chapter);
  });

  const overallPercent =
    totalMarksPool > 0
      ? Math.round((totalMarksMastered / totalMarksPool) * 1000) / 10
      : 0;

  return {
    overallPercent,
    totalMarksMastered,
    totalMarksPool,
    chapters,
  };
}

/**
 * For each exam year with chapter weights in the syllabus, sum pools and
 * mastered marks using only that year’s column, then map completion to /720.
 */
export function computeNeetYearProjections(
  rows: SyllabusRow[],
  statusBySyllabusMasterId: Record<string, string>,
  maxScore: number = 720,
): NeetYearProjection[] {
  if (maxScore <= 0) return [];
  const chapterBuckets = buildChapterBuckets(rows);
  const out: NeetYearProjection[] = [];
  const cap = maxScore;

  for (const year of PROJECTION_YEARS) {
    if (!dataHasPositiveYear(rows, year)) continue;

    let pool = 0;
    let mastered = 0;

    for (const [, list] of chapterBuckets) {
      const w = chapterMarksPoolForYearRows(list, year);
      if (w <= 0) continue;

      let completedCount = 0;
      for (const row of list) {
        if (
          resolveStatus(row.id, statusBySyllabusMasterId) === "completed"
        ) {
          completedCount++;
        }
      }
      const totalCount = list.length;
      const allDone = totalCount > 0 && completedCount === totalCount;

      pool += w;
      if (allDone) mastered += w;
    }

    if (pool <= 0) continue;

    const projectedOutOf720 = Math.min(
      cap,
      Math.round((mastered / pool) * cap),
    );
    const { patternLabel, completionNote } = labelsForYear(year);
    out.push({
      year,
      totalMarksPool: pool,
      totalMarksMastered: mastered,
      projectedOutOf720,
      patternLabel,
      completionNote,
    });
  }

  return out.sort((a, b) => b.year - a.year);
}
