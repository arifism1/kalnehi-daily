"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePaidOrTrialAccess } from "@/lib/subscriptionGuard";
import type { Tables, TablesInsert } from "@/types/supabase";
import { recordXpEvent } from "@/actions/xp";

export type MockTestRow = Tables<"mock_tests">;
export type MockTestSubjectScoreRow = Tables<"mock_test_subject_scores">;

export type MockTestWithScores = MockTestRow & {
  mock_test_subject_scores: MockTestSubjectScoreRow[];
};

export type SubjectScoreInput = {
  subject: string;
  maxScore?: number | null;
  score?: number | null;
};

export type UpsertMockTestInput = {
  id?: string;
  testDate: string;
  testName: string;
  examName: string;
  scoreType: "raw" | "percentage" | "percentile";
  maxScore?: number | null;
  totalScore?: number | null;
  durationMinutes?: number | null;
  selfRating?: "strong" | "average" | "weak" | null;
  notes?: string | null;
  subjectScores: SubjectScoreInput[];
};

export async function upsertMockTest(
  input: UpsertMockTestInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const access = await requirePaidOrTrialAccess(supabase, user.id);
    if (!access.ok) return access;

    const testPayload: TablesInsert<"mock_tests"> = {
      user_id: user.id,
      test_date: input.testDate,
      test_name: input.testName,
      exam_name: input.examName,
      score_type: input.scoreType,
      max_score: input.maxScore ?? null,
      total_score: input.totalScore ?? null,
      duration_minutes: input.durationMinutes ?? null,
      self_rating: input.selfRating ?? null,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    let testId: string;

    if (input.id) {
      const { error } = await supabase
        .from("mock_tests")
        .update(testPayload)
        .eq("id", input.id)
        .eq("user_id", user.id);
      if (error) return { ok: false, error: error.message };
      testId = input.id;

      // Delete existing subject scores before re-inserting.
      // Check the result — a silent failure here would leave stale scores.
      const { error: deleteErr } = await supabase
        .from("mock_test_subject_scores")
        .delete()
        .eq("mock_test_id", testId);
      if (deleteErr) return { ok: false, error: deleteErr.message };
    } else {
      const { data, error } = await supabase
        .from("mock_tests")
        .insert(testPayload)
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      testId = data.id;
    }

    if (input.subjectScores.length > 0) {
      const scoreRows = input.subjectScores.map((s) => ({
        mock_test_id: testId,
        subject: s.subject,
        max_score: s.maxScore ?? null,
        score: s.score ?? null,
      }));
      const { error: scoresError } = await supabase
        .from("mock_test_subject_scores")
        .insert(scoreRows);
      if (scoresError) return { ok: false, error: scoresError.message };
    }

    revalidatePath("/mock-tests");
    revalidatePath("/progress");
    if (!input.id) {
      const xpRes = await recordXpEvent("mock_logged", testId, ["/home", "/mock-tests"]);
      if (!xpRes.ok) {
        console.warn("[upsertMockTest] XP award skipped", xpRes.error);
      }
    }
    return { ok: true, id: testId };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function deleteMockTest(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const { error } = await supabase
      .from("mock_tests")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/mock-tests");
    revalidatePath("/progress");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function getMockTests(): Promise<
  { ok: true; data: MockTestWithScores[] } | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("mock_tests")
      .select("*, mock_test_subject_scores(*)")
      .eq("user_id", user.id)
      .order("test_date", { ascending: false });

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as MockTestWithScores[] };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
