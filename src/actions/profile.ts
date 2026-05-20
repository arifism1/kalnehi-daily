"use server";

import { revalidatePath } from "next/cache";

import type { PrevScoreEntry } from "@/lib/prevScoreEntries";
import { formatSupabaseError } from "@/lib/supabase";
import { isUpscCseMainsExam } from "@/lib/upscMainsOptionalSubjects";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { JourneyAction } from "@/lib/analytics/journeyEvents";
import { recordJourneyMilestoneServer } from "@/lib/journey/milestones";
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
  /** First entry mirrors legacy `prev_score` for older readers. */
  prev_score?: number | null;
  /** Labeled past attempts, e.g. [{ label: "UPSC Pre 2025", score: 412 }]. */
  prev_score_entries?: PrevScoreEntry[] | null;
  /** CUET domain subjects; ignored for non-CUET exams (stored as [] ). */
  cuet_domain_subjects?: string[] | null;
  /** UPSC CSE Mains optional subject base name; null for non-mains exams. */
  upsc_optional_subject?: string | null;
  /** Track system: the track ID chosen at onboarding. */
  selected_track?: string | null;
  /** Track system: ordered exam_name keys the user has enabled within their track. */
  enabled_exams_in_track?: string[] | null;
  /** Per-exam dates map. Keys are exam labels (as in enabled_exams_in_track). */
  exam_dates?: Record<string, string> | null;
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
    const upscOptional =
      isUpscCseMainsExam(examToSave) || isUpscCseMainsExam(primaryExam)
        ? (fields.upsc_optional_subject?.trim() || null)
        : null;

    const patchBase = {
      full_name: fields.full_name?.trim() || null,
      target_exam_date: targetExamDate,
      primary_exam: examToSave,
      target_exam: targetExam,
      cuet_domain_subjects: cuetDomains,
      upsc_optional_subjects: upscOptional ? [upscOptional] : null,
      ...(fields.selected_track !== undefined
        ? { selected_track: fields.selected_track }
        : {}),
      ...(fields.enabled_exams_in_track !== undefined
        ? { enabled_exams_in_track: fields.enabled_exams_in_track }
        : {}),
      ...(fields.exam_dates !== undefined
        ? { exam_dates: fields.exam_dates ?? null }
        : {}),
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

    if (fields.prev_score != null && fields.prev_score > 0) {
      void recordJourneyMilestoneServer(user.id, JourneyAction.CURRENT_SCORE_ENTERED);
    }
    if (examHistoryPatch?.prev_score_entries && Array.isArray(examHistoryPatch.prev_score_entries)) {
      const entries = examHistoryPatch.prev_score_entries as { score?: number }[];
      if (entries.some((e) => typeof e.score === "number" && e.score > 0)) {
        void recordJourneyMilestoneServer(user.id, JourneyAction.CURRENT_SCORE_ENTERED);
      }
    }

    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    console.error("[profile.upsert] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function saveEnabledFeatures(
  featureIds: string[] | null,
): Promise<UpsertProfileResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { ok: false, error: USER_ERROR.session };
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ enabled_features: featureIds })
      .eq("user_id", user.id);

    if (error) throw error;
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("[profile.saveEnabledFeatures] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function completeOnboarding(fields: {
  full_name: string;
  phone_number?: string;
  class_studying: string;
  /** Track ID, e.g. "jee". */
  selected_track: string;
  /** Ordered exam_name keys the user enabled in their track. */
  enabled_exams_in_track: string[];
  /**
   * Per-exam target dates; only exam keys the user filled are included.
   * Omitted or empty for every exam is allowed.
   */
  exam_dates?: Record<string, string> | null;
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

    const name = fields.full_name.trim();
    const phoneRaw = (fields.phone_number ?? "").trim();
    const cls = fields.class_studying.trim();
    const track = fields.selected_track.trim();
    const enabledExams = fields.enabled_exams_in_track.filter((e) => e.trim());
    const rawMap =
      fields.exam_dates &&
      typeof fields.exam_dates === "object" &&
      !Array.isArray(fields.exam_dates)
        ? (fields.exam_dates as Record<string, string>)
        : {};

    if (!name) return { ok: false, error: "Please enter your name." };
    if (phoneRaw && !/^\d{10}$/.test(phoneRaw))
      return {
        ok: false,
        error: "Please enter a valid 10-digit phone number, or leave it blank.",
      };
    const phone = phoneRaw || null;
    if (!cls) return { ok: false, error: "Please select your class." };
    if (!track) return { ok: false, error: "Please choose a track." };
    if (enabledExams.length === 0)
      return { ok: false, error: "Please select at least one exam in your track." };

    const examDatesNormalized: Record<string, string> = {};
    for (const key of enabledExams) {
      const v = rawMap[key]?.trim();
      if (!v) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return { ok: false, error: "Please enter a valid date for each exam, or clear the field." };
      }
      examDatesNormalized[key] = v;
    }

    // Legacy single date: first non-empty in track order (same as profile home countdown fallback).
    const firstDateInOrder =
      enabledExams.map((k) => examDatesNormalized[k]).find((d) => d) ?? null;

    // Derive primary_exam from the first enabled exam for backward compatibility
    // with all consumers that still read user_profiles.primary_exam / target_exam.
    const primaryExam = enabledExams[0]!;

    const examDatesPayload =
      Object.keys(examDatesNormalized).length > 0 ? examDatesNormalized : null;

    const now = new Date().toISOString();
    const patch = {
      full_name: name,
      phone_number: phone,
      class_studying: cls,
      selected_track: track,
      enabled_exams_in_track: enabledExams,
      primary_exam: primaryExam,
      target_exam: primaryExam,
      target_exam_date: firstDateInOrder,
      exam_dates: examDatesPayload,
      cuet_domain_subjects: [] as string[],
      upsc_optional_subjects: null,
      mandatory_onboarding_completed_at: now,
      updated_at: now,
    };

    const { data: existing, error: selErr } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    if (selErr) throw selErr;

    if ((existing?.length ?? 0) > 0) {
      const { error } = await supabase
        .from("user_profiles")
        .update(patch)
        .eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("user_profiles")
        .insert({ user_id: user.id, ...patch });
      if (error) throw error;
    }

    void recordJourneyMilestoneServer(user.id, JourneyAction.ONBOARDING_COMPLETED);

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("[profile.completeOnboarding] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

/**
 * Saves the user's enabled exam subset within their track. Also updates
 * `primary_exam` / `target_exam` to the first enabled exam so other
 * consumers (countdown, leaderboard cohort) keep working.
 */
export async function saveEnabledExamsInTrack(fields: {
  selected_track: string;
  enabled_exams_in_track: string[];
}): Promise<UpsertProfileResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const enabledExams = fields.enabled_exams_in_track.filter((e) => e.trim());
    if (enabledExams.length === 0) {
      return { ok: false, error: "Please enable at least one exam." };
    }
    const primaryExam = enabledExams[0]!;

    const { error } = await supabase
      .from("user_profiles")
      .update({
        selected_track: fields.selected_track,
        enabled_exams_in_track: enabledExams,
        primary_exam: primaryExam,
        target_exam: primaryExam,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    console.error("[profile.saveEnabledExamsInTrack] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

/**
 * Changes the user's track entirely (with full reset of enabled exams).
 * Used by the "Change Track" flow in Profile — requires explicit user confirmation.
 */
export async function changeTrack(fields: {
  selected_track: string;
  enabled_exams_in_track: string[];
}): Promise<UpsertProfileResult> {
  return saveEnabledExamsInTrack(fields);
}
