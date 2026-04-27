"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import {
  assertSyllabusBelongsToUserExam,
  getUserEnabledExamKeys,
  SyllabusExamScopeError,
} from "@/lib/syllabusMasterWriteGuards";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { formatSupabaseError } from "@/lib/supabase";

export type UpsertMarksOverridePayload = {
  examName: string;
  syllabusMasterId: string;
  marks_2025: number | null;
  marks_2024: number | null;
  marks_2023: number | null;
};

export type MarksActionResult = { ok: true } | { ok: false; error: string };

/**
 * If all marks are null, deletes the override row; otherwise upserts.
 */
export async function upsertSyllabusMarksOverride(
  payload: UpsertMarksOverridePayload,
): Promise<MarksActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }

    const sid = normalizeSyllabusMasterId(payload.syllabusMasterId);

    const { examKeys } = await getUserEnabledExamKeys(supabase, user.id);
    const name = payload.examName.trim();
    if (examKeys.length === 0 || !examKeys.includes(name)) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }
    try {
      await assertSyllabusBelongsToUserExam(supabase, user.id, [sid]);
    } catch (e) {
      if (e instanceof SyllabusExamScopeError) {
        return { ok: false, error: USER_ERROR.tryAgain };
      }
      throw e;
    }

    const allNull =
      payload.marks_2025 == null &&
      payload.marks_2024 == null &&
      payload.marks_2023 == null;

    if (allNull) {
      const { error } = await supabase
        .from("user_syllabus_marks_overrides")
        .delete()
        .eq("user_id", user.id)
        .eq("syllabus_master_id", sid);
      if (error) return { ok: false, error: formatSupabaseError(error) };
    } else {
      const { error } = await supabase.from("user_syllabus_marks_overrides").upsert(
        {
          user_id: user.id,
          exam_name: payload.examName,
          syllabus_master_id: sid,
          marks_2025: payload.marks_2025,
          marks_2024: payload.marks_2024,
          marks_2023: payload.marks_2023,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,syllabus_master_id" },
      );
      if (error) return { ok: false, error: formatSupabaseError(error) };
    }

    revalidatePath("/syllabus");
    revalidatePath("/");
    revalidatePath("/progress");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}
