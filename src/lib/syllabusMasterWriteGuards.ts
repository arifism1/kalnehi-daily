import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveSyllabusExam, syllabusCatalogExamName } from "@/lib/examProfile";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import {
  isUpscCseMainsExam,
  shouldKeepUpscMainsRow,
} from "@/lib/upscMainsOptionalSubjects";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

const ID_CHUNK = 120;

/** Thrown when a syllabus_master id (or custom_row_id) is not part of the signed-in user's catalog exam. */
export class SyllabusExamScopeError extends Error {
  constructor(message = "Syllabus row is outside the user catalog exam") {
    super(message);
    this.name = "SyllabusExamScopeError";
  }
}

export type UserCatalogExamContext = {
  /** Canonical `syllabus_master.exam_name` (or UPSC RPC scope). */
  examKey: string;
  examLabel: string | null;
  upscOptionalSubject: string | null;
};

/**
 * Returns all enabled exam keys for the user (from their track's
 * `enabled_exams_in_track`, falling back to their single `target_exam`).
 * These are canonical `syllabus_master.exam_name` values.
 */
export async function getUserEnabledExamKeys(
  supabase: Client,
  userId: string,
): Promise<{ examKeys: string[]; upscOptionalSubject: string | null }> {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("target_exam, primary_exam, enabled_exams_in_track, upsc_optional_subjects")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !profile) return { examKeys: [], upscOptionalSubject: null };

  const upscOptionalSubject = Array.isArray(profile.upsc_optional_subjects)
    ? (profile.upsc_optional_subjects[0]?.trim() || null)
    : null;

  const enabledRaw = Array.isArray(profile.enabled_exams_in_track)
    ? (profile.enabled_exams_in_track as string[]).filter((e) => e?.trim())
    : [];

  if (enabledRaw.length > 0) {
    const examKeys = enabledRaw
      .map((name) => syllabusCatalogExamName(name))
      .filter((k): k is string => Boolean(k));
    return { examKeys, upscOptionalSubject };
  }

  // Legacy path: single exam from profile
  const examLabel = resolveSyllabusExam(profile);
  const examKey = examLabel?.trim() ? syllabusCatalogExamName(examLabel) : null;
  return { examKeys: examKey ? [examKey] : [], upscOptionalSubject };
}

/**
 * Resolves the user's primary syllabus catalog key from `user_profiles`
 * (`target_exam` then `primary_exam`). Kept for backward compat.
 */
export async function getUserCatalogExamContext(
  supabase: Client,
  userId: string,
): Promise<UserCatalogExamContext | null> {
  const { examKeys, upscOptionalSubject } = await getUserEnabledExamKeys(
    supabase,
    userId,
  );
  if (examKeys.length === 0) return null;
  return {
    examKey: examKeys[0]!,
    examLabel: examKeys[0]!,
    upscOptionalSubject,
  };
}

/**
 * Among `candidateIds`, returns normalized ids that are allowed for this user:
 * catalog `syllabus_master` rows for ANY of their enabled exam keys (with UPSC
 * optional visibility), or user-added microtopics (`custom_row_id`) for those exams.
 */
export async function resolveAllowedSyllabusMasterIdsForUser(
  supabase: Client,
  userId: string,
  candidateIds: string[],
): Promise<Set<string>> {
  const normalized = [
    ...new Set(
      candidateIds
        .map((id) => normalizeSyllabusMasterId(String(id)))
        .filter((id) => id.length > 0),
    ),
  ];
  const allowed = new Set<string>();
  if (normalized.length === 0) return allowed;

  const { examKeys, upscOptionalSubject } = await getUserEnabledExamKeys(
    supabase,
    userId,
  );
  if (examKeys.length === 0) return allowed;

  // Check against each enabled exam key
  for (const examKey of examKeys) {
    for (let i = 0; i < normalized.length; i += ID_CHUNK) {
      const chunk = normalized.slice(i, i + ID_CHUNK);
      const { data: smRows, error: smErr } = await supabase
        .from("syllabus_master")
        .select("id, subject")
        .eq("exam_name", examKey)
        .in("id", chunk);
      if (smErr) continue;
      for (const row of smRows ?? []) {
        const sid = normalizeSyllabusMasterId(String(row.id));
        if (isUpscCseMainsExam(examKey)) {
          if (
            shouldKeepUpscMainsRow({
              subject: row.subject ?? "",
              selectedOptional: upscOptionalSubject,
            })
          ) {
            allowed.add(sid);
          }
        } else {
          allowed.add(sid);
        }
      }
    }
  }

  const stillNeed = normalized.filter((id) => !allowed.has(id));
  for (const examKey of examKeys) {
    for (let i = 0; i < stillNeed.length; i += ID_CHUNK) {
      const chunk = stillNeed.slice(i, i + ID_CHUNK);
      const { data: adds, error: addErr } = await supabase
        .from("user_syllabus_customizations")
        .select("custom_row_id")
        .eq("user_id", userId)
        .eq("exam_name", examKey)
        .eq("action_type", "add")
        .eq("target_type", "microtopic")
        .in("custom_row_id", chunk);
      if (addErr) continue;
      for (const r of adds ?? []) {
        if (r.custom_row_id) {
          allowed.add(normalizeSyllabusMasterId(String(r.custom_row_id)));
        }
      }
    }
  }

  return allowed;
}

/**
 * True when every id is either a catalog `syllabus_master` row for the user's resolved exam
 * (including UPSC optional visibility) or a user-added microtopic (`custom_row_id`) for that exam.
 */
export async function userCatalogAllowsSyllabusMasterIds(
  supabase: Client,
  userId: string,
  ids: string[],
): Promise<boolean> {
  const normalized = [
    ...new Set(
      ids
        .map((id) => normalizeSyllabusMasterId(String(id)))
        .filter((id) => id.length > 0),
    ),
  ];
  if (normalized.length === 0) return true;

  const allowed = await resolveAllowedSyllabusMasterIdsForUser(
    supabase,
    userId,
    normalized,
  );
  return normalized.every((id) => allowed.has(id));
}

/**
 * Strong guard: throws {@link SyllabusExamScopeError} unless every syllabus id belongs to the user's exam catalog.
 */
export async function assertSyllabusBelongsToUserExam(
  supabase: Client,
  userId: string,
  syllabusIds: string[],
): Promise<void> {
  const normalized = [
    ...new Set(
      syllabusIds
        .map((id) => normalizeSyllabusMasterId(String(id)))
        .filter((id) => id.length > 0),
    ),
  ];
  if (normalized.length === 0) return;

  const allowed = await resolveAllowedSyllabusMasterIdsForUser(
    supabase,
    userId,
    normalized,
  );
  const rejected = normalized.filter((id) => !allowed.has(id));
  if (rejected.length > 0) {
    throw new SyllabusExamScopeError();
  }
}
