"use server";

import { revalidatePath } from "next/cache";

import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UpsertProfileResult =
  | { ok: true }
  | { ok: false; error: string };

export async function upsertUserProfile(fields: {
  full_name: string | null;
  target_exam_date: string | null;
  primary_exam: string | null;
  target_exam?: string | null;
  prev_exam_attempted?: boolean | null;
  prev_score?: number | null;
  /** CUET domain subjects; ignored for non-CUET exams (stored as [] ). */
  cuet_domain_subjects?: string[] | null;
}): Promise<UpsertProfileResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }

    const primaryExam = fields.primary_exam?.trim() || null;
    const targetExam =
      fields.target_exam !== undefined
        ? fields.target_exam?.trim() || null
        : primaryExam;

    const cuetDomains =
      primaryExam?.toLowerCase().trim() === "cuet" ||
      targetExam?.toLowerCase().trim() === "cuet"
        ? (fields.cuet_domain_subjects ?? []).filter(
            (s): s is string => typeof s === "string" && s.trim().length > 0,
          )
        : [];

    const patchBase = {
      full_name: fields.full_name?.trim() || null,
      target_exam_date: fields.target_exam_date?.trim() || null,
      primary_exam: primaryExam || targetExam,
      target_exam: targetExam,
      cuet_domain_subjects: cuetDomains,
      updated_at: new Date().toISOString(),
    };

    const examHistoryPatch =
      fields.prev_exam_attempted !== undefined
        ? {
            prev_exam_attempted: fields.prev_exam_attempted,
            prev_score:
              fields.prev_exam_attempted === true && fields.prev_score != null
                ? Math.round(fields.prev_score)
                : null,
          }
        : null;

    const { data: existing, error: selErr } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selErr) throw selErr;

    if (existing?.id) {
      const { error } = await supabase
        .from("user_profiles")
        .update({ ...patchBase, ...(examHistoryPatch ?? {}) })
        .eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("user_profiles").insert({
        user_id: user.id,
        ...patchBase,
        ...(examHistoryPatch ?? {
          prev_exam_attempted: null,
          prev_score: null,
        }),
      });
      if (error) throw error;
    }

    revalidatePath("/");
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}
