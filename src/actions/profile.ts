"use server";

import { revalidatePath } from "next/cache";

import type { PrevScoreEntry } from "@/lib/prevScoreEntries";
import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UpsertProfileResult =
  | { ok: true }
  | { ok: false; error: string };

function toDetailedSupabaseError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const msg =
      typeof e.message === "string" && e.message.trim().length > 0
        ? e.message
        : "Unknown profile save error";
    const code = typeof e.code === "string" ? e.code : null;
    const details =
      typeof e.details === "string" && e.details.trim().length > 0
        ? e.details
        : null;
    const hint =
      typeof e.hint === "string" && e.hint.trim().length > 0 ? e.hint : null;
    const parts = [msg];
    if (code) parts.push(`code=${code}`);
    if (details) parts.push(`details=${details}`);
    if (hint) parts.push(`hint=${hint}`);
    return parts.join(" | ");
  }
  return formatSupabaseError(err);
}

export async function upsertUserProfile(fields: {
  full_name: string | null;
  target_exam_date: string | null;
  primary_exam: string | null;
  target_exam?: string | null;
  prev_exam_attempted?: boolean | null;
  /** First entry mirrors legacy `prev_score` for older readers. */
  prev_score?: number | null;
  /** Labeled past attempts, e.g. [{ label: "UPSC Pre 2025", score: 412 }]. */
  prev_score_entries?: PrevScoreEntry[] | null;
  /** CUET domain subjects; ignored for non-CUET exams (stored as [] ). */
  cuet_domain_subjects?: string[] | null;
}): Promise<UpsertProfileResult> {
  console.log("[profile.upsert] incoming payload", fields);
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
    const examToSave = primaryExam || targetExam;
    const targetExamDate = fields.target_exam_date?.trim() || null;
    if (!examToSave) {
      return { ok: false, error: "Please select your target exam." };
    }
    if (targetExamDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetExamDate)) {
      return { ok: false, error: "Please enter a valid exam date." };
    }

    const cuetDomains =
      primaryExam?.toLowerCase().includes("cuet") ||
      targetExam?.toLowerCase().includes("cuet")
        ? (fields.cuet_domain_subjects ?? []).filter(
            (s): s is string => typeof s === "string" && s.trim().length > 0,
          )
        : [];

    const patchBase = {
      full_name: fields.full_name?.trim() || null,
      target_exam_date: targetExamDate,
      primary_exam: examToSave,
      target_exam: targetExam,
      cuet_domain_subjects: cuetDomains,
      updated_at: new Date().toISOString(),
    };
    const examHistoryPatch =
      fields.prev_exam_attempted !== undefined
        ? (() => {
            const attempted = Boolean(fields.prev_exam_attempted);
            const raw = fields.prev_score_entries;
            const normalized: PrevScoreEntry[] = Array.isArray(raw)
              ? raw
                  .filter(
                    (e) =>
                      e &&
                      typeof e.label === "string" &&
                      e.label.trim().length > 0 &&
                      typeof e.score === "number" &&
                      Number.isFinite(e.score) &&
                      e.score >= 0,
                  )
                  .map((e) => ({
                    label: e.label.trim(),
                    score: Math.round(e.score),
                  }))
              : [];
            return {
              prev_exam_attempted: attempted,
              prev_score_entries: attempted ? normalized : [],
              prev_score:
                attempted && normalized.length > 0 ? normalized[0]!.score : null,
            };
          })()
        : null;

    console.log("[profile.upsert] normalized payload", {
      patchBase,
      examHistoryPatch,
      userId: user.id,
    });

    const { data: existingRows, error: selErr } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (selErr) throw selErr;

    if ((existingRows?.length ?? 0) > 0) {
      const { error } = await supabase
        .from("user_profiles")
        .update({ ...patchBase, ...(examHistoryPatch ?? {}) })
        .eq("user_id", user.id);
      if (error) {
        console.error("[profile.upsert] update error", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
    } else {
      const { error } = await supabase.from("user_profiles").insert({
        user_id: user.id,
        ...patchBase,
        ...(examHistoryPatch ?? {
          prev_exam_attempted: null,
          prev_score: null,
          prev_score_entries: [],
        }),
      });
      if (error) {
        console.error("[profile.upsert] insert error", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
    }

    revalidatePath("/");
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    const detailed = toDetailedSupabaseError(e);
    console.error("[profile.upsert] failed", { error: detailed, raw: e });
    return { ok: false, error: detailed };
  }
}
