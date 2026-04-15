"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
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
