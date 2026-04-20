import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/supabase";

type Client = SupabaseClient<Database>;
type SyllabusMasterRow = Database["public"]["Tables"]["syllabus_master"]["Row"];

/** Same key shape as in `fetchEffortRatingsByChapter` — `subject\0chapter` after trim. */
export type ChapterMasteryMap = Map<string, number>;

export function buildChapterMasteryKey(subject: string, chapter: string): string {
  const s = subject?.trim() || "Other";
  const c = chapter?.trim() || "General";
  return `${s}\u0000${c}`;
}

function clampMasteryPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export type ChapterEffortRating = {
  subject: string;
  chapter: string;
  average_marks: number;
  relative_effort_score: number;
  /** Catalog efficiency: average_marks / effort (ignores personal progress). */
  efficiency: number;
  topic_count: number;
};

export type TargetBoostRecommendationItem = ChapterEffortRating & {
  /** Syllabus tracker microtopic progress for this chapter (0–100). */
  mastery_percent: number;
  /** average_marks × (1 − mastery_percent/100) — marks still available at chapter level. */
  effective_marks: number;
  /** Running sum of effective_marks along the greedy pick order. */
  cumulative_marks_after_pick: number;
};

export type TargetBoostRecommendation = {
  examName: string;
  targetBoost: number;
  achievedMarks: number;
  targetReached: boolean;
  remainingGap: number;
  selected: TargetBoostRecommendationItem[];
  totalCandidates: number;
};

export type SaveRecommendationHistoryInput = {
  userId: string;
  examName: string;
  targetBoost: number;
  achievedMarks: number;
  recommendedItems: TargetBoostRecommendationItem[];
  meta?: Record<string, Json>;
};

type RecommendationHistoryItem = {
  subject: string;
  chapter: string;
  average_marks: number;
  relative_effort_score: number;
  /** Progress-aware: effective_marks / effort. */
  efficiency: number;
  topic_count: number;
  mastery_percent: number;
  effective_marks: number;
  cumulative_marks_after_pick: number;
};

type ChapterAccumulator = {
  subject: string;
  chapter: string;
  marksSum: number;
  marksCount: number;
  effortSum: number;
  effortCount: number;
  topicCount: number;
};

function normalizeExamName(examName: string): string {
  return examName.trim();
}

function assertPositiveFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive number`);
  }
}

function roundTo(value: number, places: number): number {
  const base = 10 ** places;
  return Math.round(value * base) / base;
}

function toHistoryItems(
  items: TargetBoostRecommendationItem[],
): RecommendationHistoryItem[] {
  return items.map((item) => ({
    subject: item.subject,
    chapter: item.chapter,
    average_marks: roundTo(item.average_marks, 2),
    relative_effort_score: roundTo(item.relative_effort_score, 3),
    efficiency: roundTo(item.efficiency, 4),
    topic_count: item.topic_count,
    mastery_percent: roundTo(item.mastery_percent, 2),
    effective_marks: roundTo(item.effective_marks, 2),
    cumulative_marks_after_pick: roundTo(item.cumulative_marks_after_pick, 2),
  }));
}

function rowAverageMarks(row: SyllabusMasterRow): number | null {
  const marks = [row.marks_2023, row.marks_2024, row.marks_2025].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (marks.length === 0) return null;
  return marks.reduce((sum, value) => sum + value, 0) / marks.length;
}

/**
 * Efficient one-pass helper that folds syllabus rows into chapter-level effort aggregates.
 */
export function fetchEffortRatingsByChapter(
  rows: Pick<
    SyllabusMasterRow,
    | "subject"
    | "chapter"
    | "marks_2023"
    | "marks_2024"
    | "marks_2025"
    | "relative_effort_score"
  >[],
): ChapterEffortRating[] {
  const byChapter = new Map<string, ChapterAccumulator>();

  for (const row of rows) {
    const subject = row.subject?.trim() || "Other";
    const chapter = row.chapter?.trim() || "General";
    const key = `${subject}\u0000${chapter}`;

    const acc = byChapter.get(key) ?? {
      subject,
      chapter,
      marksSum: 0,
      marksCount: 0,
      effortSum: 0,
      effortCount: 0,
      topicCount: 0,
    };

    const avg = rowAverageMarks(row as SyllabusMasterRow);
    if (avg != null) {
      acc.marksSum += avg;
      acc.marksCount += 1;
    }

    if (
      typeof row.relative_effort_score === "number" &&
      Number.isFinite(row.relative_effort_score) &&
      row.relative_effort_score > 0
    ) {
      acc.effortSum += row.relative_effort_score;
      acc.effortCount += 1;
    }

    acc.topicCount += 1;
    byChapter.set(key, acc);
  }

  const ratings: ChapterEffortRating[] = [];
  for (const acc of byChapter.values()) {
    if (acc.marksCount === 0 || acc.effortCount === 0) continue;

    const averageMarks = acc.marksSum / acc.marksCount;
    const relativeEffort = acc.effortSum / acc.effortCount;
    if (averageMarks <= 0 || relativeEffort <= 0) continue;

    ratings.push({
      subject: acc.subject,
      chapter: acc.chapter,
      average_marks: roundTo(averageMarks, 2),
      relative_effort_score: roundTo(relativeEffort, 3),
      efficiency: roundTo(averageMarks / relativeEffort, 4),
      topic_count: acc.topicCount,
    });
  }

  return ratings;
}

/**
 * Fetches all chapters with effort scores for one exam, then computes chapter-level
 * average marks and efficiency.
 */
export async function getAllChaptersWithEffortScores(
  examName: string,
  supabase?: Client,
): Promise<ChapterEffortRating[]> {
  const normalizedExam = normalizeExamName(examName);
  if (!normalizedExam) {
    throw new Error("examName is required");
  }

  const client = supabase ?? (await createSupabaseServerClient());
  const { data, error } = await client
    .from("syllabus_master")
    .select(
      "subject, chapter, marks_2023, marks_2024, marks_2025, relative_effort_score",
    )
    .eq("exam_name", normalizedExam)
    .order("subject")
    .order("chapter");

  if (error) throw error;

  const ratings = fetchEffortRatingsByChapter(data ?? []);
  return ratings.sort((a, b) => {
    const efficiencyDiff = b.efficiency - a.efficiency;
    if (efficiencyDiff !== 0) return efficiencyDiff;
    const marksDiff = b.average_marks - a.average_marks;
    if (marksDiff !== 0) return marksDiff;
    const effortDiff = a.relative_effort_score - b.relative_effort_score;
    if (effortDiff !== 0) return effortDiff;
    const subjectDiff = a.subject.localeCompare(b.subject);
    if (subjectDiff !== 0) return subjectDiff;
    return a.chapter.localeCompare(b.chapter);
  });
}

type EnrichedChapter = {
  base: ChapterEffortRating;
  masteryPercent: number;
  effectiveMarks: number;
  adjustedEfficiency: number;
};

function enrichChaptersForBoost(
  chapters: ChapterEffortRating[],
  masteryMap: ChapterMasteryMap | undefined,
): EnrichedChapter[] {
  const out: EnrichedChapter[] = [];
  for (const ch of chapters) {
    const key = buildChapterMasteryKey(ch.subject, ch.chapter);
    const rawMastery = masteryMap?.get(key);
    const masteryPercent = clampMasteryPercent(
      rawMastery !== undefined && Number.isFinite(rawMastery) ? rawMastery : 0,
    );
    const effectiveMarks = ch.average_marks * (1 - masteryPercent / 100);
    if (effectiveMarks <= 0) continue;
    const adjustedEfficiency = effectiveMarks / ch.relative_effort_score;
    if (!Number.isFinite(adjustedEfficiency) || adjustedEfficiency <= 0) continue;
    out.push({
      base: ch,
      masteryPercent,
      effectiveMarks,
      adjustedEfficiency,
    });
  }
  return out;
}

/**
 * Picks chapters by **progress-aware** efficiency: (effective_marks) / effort,
 * where effective_marks = average_marks × (1 − mastery% / 100).
 * Greedy sum uses effective_marks toward the extra-marks target.
 */
export async function recommendForTargetBoost(
  targetBoost: number,
  examName: string,
  options?: { supabase?: Client; masteryMap?: ChapterMasteryMap },
): Promise<TargetBoostRecommendation> {
  assertPositiveFinite(targetBoost, "targetBoost");
  const normalizedExam = normalizeExamName(examName);
  if (!normalizedExam) {
    throw new Error("examName is required");
  }

  const baseChapters = await getAllChaptersWithEffortScores(
    normalizedExam,
    options?.supabase,
  );

  const pool = enrichChaptersForBoost(baseChapters, options?.masteryMap);
  pool.sort((a, b) => {
    const effDiff = b.adjustedEfficiency - a.adjustedEfficiency;
    if (effDiff !== 0) return effDiff;
    const mDiff = b.effectiveMarks - a.effectiveMarks;
    if (mDiff !== 0) return mDiff;
    const aEff = a.base.relative_effort_score - b.base.relative_effort_score;
    if (aEff !== 0) return aEff;
    const s = a.base.subject.localeCompare(b.base.subject);
    if (s !== 0) return s;
    return a.base.chapter.localeCompare(b.base.chapter);
  });

  const selected: TargetBoostRecommendationItem[] = [];
  let achievedMarks = 0;

  for (const row of pool) {
    if (achievedMarks >= targetBoost) break;
    const add = row.effectiveMarks;
    achievedMarks += add;
    selected.push({
      ...row.base,
      efficiency: roundTo(row.adjustedEfficiency, 4),
      mastery_percent: roundTo(row.masteryPercent, 2),
      effective_marks: roundTo(row.effectiveMarks, 2),
      cumulative_marks_after_pick: roundTo(achievedMarks, 2),
    });
  }

  const roundedAchieved = roundTo(achievedMarks, 2);
  const remainingGap = roundTo(Math.max(0, targetBoost - roundedAchieved), 2);

  return {
    examName: normalizedExam,
    targetBoost: roundTo(targetBoost, 2),
    achievedMarks: roundedAchieved,
    targetReached: roundedAchieved >= targetBoost,
    remainingGap,
    selected,
    totalCandidates: pool.length,
  };
}

export async function saveTargetRecommendationHistory(
  input: SaveRecommendationHistoryInput,
  supabase?: Client,
): Promise<string> {
  assertPositiveFinite(input.targetBoost, "targetBoost");
  if (!Number.isFinite(input.achievedMarks) || input.achievedMarks < 0) {
    throw new Error("achievedMarks must be a non-negative number");
  }

  const normalizedExam = normalizeExamName(input.examName);
  if (!normalizedExam) {
    throw new Error("examName is required");
  }
  if (!input.userId?.trim()) {
    throw new Error("userId is required");
  }

  const client = supabase ?? (await createSupabaseServerClient());
  const normalizedItems = toHistoryItems(input.recommendedItems);
  const { data, error } = await client
    .from("user_target_recommendation_history")
    .insert({
      user_id: input.userId,
      exam_name: normalizedExam,
      target_boost: roundTo(input.targetBoost, 2),
      achieved_marks: roundTo(input.achievedMarks, 2),
      recommended_items: normalizedItems as unknown as Json,
      meta: (input.meta ?? {}) as unknown as Json,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Failed to save recommendation history");
  return data.id;
}
