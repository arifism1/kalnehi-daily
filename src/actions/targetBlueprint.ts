"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import {
  buildChapterMasteryKey,
  recommendForTargetBoost,
  saveTargetRecommendationHistory,
  type ChapterMasteryMap,
  type TargetBoostRecommendation,
  type TargetBoostRecommendationItem,
} from "@/lib/targetScoreEngine";
import type { Json } from "@/types/supabase";

export type SaveTargetBlueprintChapter = {
  subject: string;
  chapter: string;
  chapterMarksTotal: number;
  microtopicProgressPercent: number;
};

export type SaveUserTargetBlueprintPayload = {
  examName: string;
  maxScore: number;
  targetClamped: number;
  rangeLow: number;
  rangeHigh: number;
  mode: "absolute" | "gain";
  estimatedMarksAtSave: number;
  totalMarksCovered: number;
  chapters: SaveTargetBlueprintChapter[];
};

export type SaveTargetBlueprintResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type TargetBoostRecommendationResult =
  | { ok: true; recommendation: TargetBoostRecommendation }
  | { ok: false; error: string };

export type SaveTargetBoostHistoryResult =
  | { ok: true; historyId: string }
  | { ok: false; error: string };

function isValidMode(m: string): m is "absolute" | "gain" {
  return m === "absolute" || m === "gain";
}

export async function saveUserTargetBlueprint(
  payload: SaveUserTargetBlueprintPayload,
): Promise<SaveTargetBlueprintResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }

    const exam = payload.examName?.trim();
    if (!exam) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }
    if (!isValidMode(payload.mode)) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }
    if (!Array.isArray(payload.chapters) || payload.chapters.length === 0) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }
    for (const ch of payload.chapters) {
      if (
        typeof ch.subject !== "string" ||
        typeof ch.chapter !== "string" ||
        typeof ch.chapterMarksTotal !== "number" ||
        typeof ch.microtopicProgressPercent !== "number"
      ) {
        return { ok: false, error: USER_ERROR.tryAgain };
      }
    }

    const chaptersJson = payload.chapters as unknown as Json;

    const { data, error } = await supabase
      .from("user_target_blueprints")
      .insert({
        user_id: user.id,
        exam_name: exam,
        max_score: Math.round(payload.maxScore),
        target_clamped: Math.round(payload.targetClamped),
        range_low: Math.round(payload.rangeLow),
        range_high: Math.round(payload.rangeHigh),
        mode: payload.mode,
        estimated_marks_at_save: Math.round(payload.estimatedMarksAtSave),
        total_marks_covered: Math.round(payload.totalMarksCovered),
        chapters: chaptersJson,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      return {
        ok: false,
        error: error ? formatSupabaseError(error) : USER_ERROR.tryAgain,
      };
    }
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export type MasteryChapterInput = {
  subject: string;
  chapter: string;
  masteryPercent: number;
};

function toMasteryMap(
  rows: MasteryChapterInput[] | undefined,
): ChapterMasteryMap | undefined {
  if (!rows?.length) return undefined;
  const m: ChapterMasteryMap = new Map();
  for (const r of rows) {
    if (typeof r.subject !== "string" || typeof r.chapter !== "string") continue;
    if (typeof r.masteryPercent !== "number" || !Number.isFinite(r.masteryPercent)) {
      continue;
    }
    const key = buildChapterMasteryKey(r.subject, r.chapter);
    m.set(key, r.masteryPercent);
  }
  return m.size > 0 ? m : undefined;
}

export async function getTargetBoostRecommendation(
  examName: string,
  targetBoost: number,
  masteryChapters?: MasteryChapterInput[],
): Promise<TargetBoostRecommendationResult> {
  try {
    const exam = examName?.trim();
    if (!exam || !Number.isFinite(targetBoost) || targetBoost <= 0) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }

    const recommendation = await recommendForTargetBoost(targetBoost, exam, {
      supabase,
      masteryMap: toMasteryMap(masteryChapters),
    });

    return { ok: true, recommendation };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

function isValidBoostHistoryItem(
  row: unknown,
): row is TargetBoostRecommendationItem {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.subject === "string" &&
    typeof r.chapter === "string" &&
    typeof r.average_marks === "number" &&
    Number.isFinite(r.average_marks) &&
    typeof r.relative_effort_score === "number" &&
    Number.isFinite(r.relative_effort_score) &&
    typeof r.efficiency === "number" &&
    Number.isFinite(r.efficiency) &&
    typeof r.topic_count === "number" &&
    Number.isFinite(r.topic_count) &&
    typeof r.mastery_percent === "number" &&
    Number.isFinite(r.mastery_percent) &&
    typeof r.effective_marks === "number" &&
    Number.isFinite(r.effective_marks) &&
    typeof r.cumulative_marks_after_pick === "number" &&
    Number.isFinite(r.cumulative_marks_after_pick)
  );
}

/**
 * Persists a target-boost recommendation to user_target_recommendation_history.
 * Call only after the user explicitly chooses "Save to My Target".
 */
export async function saveTargetBoostRecommendationHistory(payload: {
  examName: string;
  targetBoost: number;
  achievedMarks: number;
  selected: unknown[];
}): Promise<SaveTargetBoostHistoryResult> {
  try {
    const exam = payload.examName?.trim();
    if (!exam || !Number.isFinite(payload.targetBoost) || payload.targetBoost <= 0) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }
    if (
      !Number.isFinite(payload.achievedMarks) ||
      payload.achievedMarks < 0
    ) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }
    if (!Array.isArray(payload.selected) || payload.selected.length === 0) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }
    const selected: TargetBoostRecommendationItem[] = [];
    for (const row of payload.selected) {
      if (!isValidBoostHistoryItem(row)) {
        return { ok: false, error: USER_ERROR.tryAgain };
      }
      selected.push(row);
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }

    const historyId = await saveTargetRecommendationHistory(
      {
        userId: user.id,
        examName: exam,
        targetBoost: payload.targetBoost,
        achievedMarks: payload.achievedMarks,
        recommendedItems: selected,
        meta: {
          source: "target-score-blueprint",
          strategy: "effective_marks_efficiency_greedy",
        },
      },
      supabase,
    );

    return { ok: true, historyId };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}
