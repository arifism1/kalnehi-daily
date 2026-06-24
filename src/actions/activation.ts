"use server";

import { revalidatePath } from "next/cache";

import { upsertMockTest } from "@/actions/mockTests";
import { JourneyAction } from "@/lib/analytics/journeyEvents";
import { recordJourneyMilestoneServer } from "@/lib/journey/milestones";
import { examScoreMax } from "@/lib/examProfile";
import { targetToRange } from "@/lib/targetScoreBlueprint";
import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export type ActivationResult = { ok: true } | { ok: false; error: string };

export async function saveActivationScores(input: {
  examName: string;
  mockScore: number;
  targetScore: number;
}): Promise<ActivationResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const exam = input.examName?.trim();
    if (!exam) return { ok: false, error: "Exam is required." };

    const mock = Math.round(input.mockScore);
    const target = Math.round(input.targetScore);
    const maxScore = examScoreMax(exam);
    if (!Number.isFinite(mock) || mock < 0 || mock > maxScore) {
      return { ok: false, error: "Enter a valid mock score." };
    }
    if (!Number.isFinite(target) || target <= 0 || target > maxScore) {
      return { ok: false, error: "Enter a valid target score." };
    }

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("ui_prefs")
      .eq("user_id", user.id)
      .maybeSingle();

    const prevPrefs =
      profile?.ui_prefs && typeof profile.ui_prefs === "object"
        ? (profile.ui_prefs as Record<string, unknown>)
        : {};

    const { error: profileErr } = await supabase
      .from("user_profiles")
      .update({
        prev_score: mock,
        prev_exam_attempted: true,
        prev_score_entries: [{ label: "Latest mock", score: mock }] as unknown as Json,
        ui_prefs: {
          ...prevPrefs,
          activation_scores_saved_at: now,
        } as Json,
        updated_at: now,
      })
      .eq("user_id", user.id);
    if (profileErr) return { ok: false, error: formatSupabaseError(profileErr) };

    const mockRes = await upsertMockTest({
      testDate: today,
      testName: "Onboarding mock",
      examName: exam,
      scoreType: "raw",
      maxScore: maxScore,
      totalScore: mock,
      subjectScores: [],
    });
    if (!mockRes.ok) return { ok: false, error: mockRes.error };

    const range = targetToRange(target, maxScore);
    const { error: blueprintErr } = await supabase.from("user_target_blueprints").insert({
      user_id: user.id,
      exam_name: exam,
      max_score: maxScore,
      target_clamped: range.clampedTarget,
      range_low: range.low,
      range_high: range.high,
      mode: "absolute",
      estimated_marks_at_save: mock,
      total_marks_covered: 0,
      chapters: [] as Json,
    });
    if (blueprintErr) return { ok: false, error: formatSupabaseError(blueprintErr) };

    void recordJourneyMilestoneServer(user.id, JourneyAction.CURRENT_SCORE_ENTERED);
    void recordJourneyMilestoneServer(user.id, JourneyAction.TARGET_SCORE_ENTERED);
    void recordJourneyMilestoneServer(user.id, JourneyAction.FIRST_MOCK);

    revalidatePath("/syllabus");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function completeActivationFlow(): Promise<ActivationResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const now = new Date().toISOString();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("ui_prefs")
      .eq("user_id", user.id)
      .maybeSingle();

    const prevPrefs =
      profile?.ui_prefs && typeof profile.ui_prefs === "object"
        ? (profile.ui_prefs as Record<string, unknown>)
        : {};

    const { error } = await supabase
      .from("user_profiles")
      .update({
        ui_prefs: {
          ...prevPrefs,
          activation_flow_completed_at: now,
        } as Json,
        updated_at: now,
      })
      .eq("user_id", user.id);
    if (error) return { ok: false, error: formatSupabaseError(error) };

    revalidatePath("/syllabus");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function getActivationFlowStatus(): Promise<{
  scoresSaved: boolean;
  flowCompleted: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { scoresSaved: false, flowCompleted: false };

  const { data } = await supabase
    .from("user_profiles")
    .select("ui_prefs, prev_score")
    .eq("user_id", user.id)
    .maybeSingle();

  const prefs =
    data?.ui_prefs && typeof data.ui_prefs === "object"
      ? (data.ui_prefs as Record<string, unknown>)
      : {};

  return {
    scoresSaved:
      typeof prefs.activation_scores_saved_at === "string" ||
      (typeof data?.prev_score === "number" && data.prev_score > 0),
    flowCompleted: typeof prefs.activation_flow_completed_at === "string",
  };
}
