import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import {
  isCuetExam,
  primaryMarksYearFromTargetExam,
  resolveSyllabusExam,
  syllabusCatalogExamName,
} from "@/lib/examProfile";
import {
  parseCuetDomainSubjectsJson,
  syllabusSubjectInCuetDomains,
} from "@/lib/cuetDomainSubjects";
import { fetchUserMicrotopicProgressForSyllabusIds } from "@/lib/fetchUserMicrotopicProgressForSyllabusIds";
import { applyMarksOverridesToRows, type SyllabusMarksOverrideRow } from "@/lib/applySyllabusMarksOverrides";
import {
  coalesceProgressByCanonicalIds,
  dedupeMergedSyllabusRowsByPlacement,
} from "@/lib/syllabusDedupe";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import type { SyllabusRow } from "@/lib/syllabusGrouping";
import { fetchSyllabusMasterRowsForExam } from "@/lib/syllabusMasterQuery";
import {
  fetchChapterMarks,
  injectChapterMarksIntoRows,
} from "@/lib/fetchChapterMarks";
import {
  mergeSyllabusWithUserCustomizations,
  type MergedSyllabusRow,
} from "@/lib/userSyllabusMerge";
import {
  isUpscCseMainsExam,
  shouldKeepUpscMainsRow,
} from "@/lib/upscMainsOptionalSubjects";

function progressRowsToMap(
  rows: { syllabus_master_id: unknown; status: unknown }[] | null,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const r of rows ?? []) {
    const sid = r.syllabus_master_id;
    if (
      sid != null &&
      String(sid).length > 0 &&
      typeof r.status === "string"
    ) {
      map[normalizeSyllabusMasterId(String(sid))] = r.status;
    }
  }
  return map;
}

function filterProgressToSyllabusIds(
  fullMap: Record<string, string>,
  syllabusRows: SyllabusRow[],
): Record<string, string> {
  const allowed = new Set(
    syllabusRows.map((r) => normalizeSyllabusMasterId(r.id)),
  );
  const out: Record<string, string> = {};
  for (const id of allowed) {
    if (fullMap[id] !== undefined) out[id] = fullMap[id];
  }
  return out;
}

export type SyllabusDataForUserResult = {
  examLabel: string | null;
  catalogExamKey: string | null;
  cohortKey: string | null;
  cuetDomainSubjects: string[];
  upscOptionalSubject: string | null;
  rows: MergedSyllabusRow[];
  statusBySyllabusMasterId: Record<string, string>;
  primaryMarksYear: number;
};

/**
 * Loads merged syllabus rows + progress map for a user (same pipeline as
 * {@link useSyllabusTracker}). Works with browser or service-role client.
 */
export async function loadSyllabusDataForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SyllabusDataForUserResult> {
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("primary_exam, target_exam, cuet_domain_subjects, upsc_optional_subjects")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr) throw profileErr;

  const examLabel = resolveSyllabusExam(profile);
  const domains = parseCuetDomainSubjectsJson(profile?.cuet_domain_subjects);
  const optionalSubject = Array.isArray(profile?.upsc_optional_subjects)
    ? (profile.upsc_optional_subjects[0]?.trim() || null)
    : null;

  if (!examLabel?.trim()) {
    return {
      examLabel: null,
      catalogExamKey: null,
      cohortKey: null,
      cuetDomainSubjects: domains,
      upscOptionalSubject: optionalSubject,
      rows: [],
      statusBySyllabusMasterId: {},
      primaryMarksYear: primaryMarksYearFromTargetExam(null),
    };
  }

  const examKey = syllabusCatalogExamName(examLabel);
  if (!examKey) {
    return {
      examLabel,
      catalogExamKey: null,
      cohortKey: null,
      cuetDomainSubjects: domains,
      upscOptionalSubject: optionalSubject,
      rows: [],
      statusBySyllabusMasterId: {},
      primaryMarksYear: primaryMarksYearFromTargetExam(examLabel),
    };
  }

  const [syllabus, customsRes, marksRes, chapterMarksMap] = await Promise.all([
    fetchSyllabusMasterRowsForExam(
      supabase,
      examKey,
      optionalSubject ?? null,
    ),
    supabase
      .from("user_syllabus_customizations")
      .select("*")
      .eq("user_id", userId)
      .eq("exam_name", examKey),
    supabase
      .from("user_syllabus_marks_overrides")
      .select("syllabus_master_id, marks_2025, marks_2024, marks_2023")
      .eq("user_id", userId)
      .eq("exam_name", examKey),
    fetchChapterMarks(supabase, examKey),
  ]);

  const { data: customs, error: cuErr } = customsRes;
  const { data: marksOverrides, error: moErr } = marksRes;
  if (cuErr) throw cuErr;
  if (moErr) throw moErr;

  let merged = mergeSyllabusWithUserCustomizations(
    syllabus,
    customs ?? [],
    examKey,
  );
  if (examKey === "CUET" && domains.length > 0) {
    merged = merged.filter((r) =>
      syllabusSubjectInCuetDomains(r.subject, domains),
    );
  } else if (examKey === "CUET") {
    merged = [];
  }
  if (isUpscCseMainsExam(examKey)) {
    merged = merged.filter((row) =>
      shouldKeepUpscMainsRow({
        subject: row.subject,
        selectedOptional: optionalSubject,
      }),
    );
  }
  // Inject chapter-level marks before applying user overrides.
  // Each row in a chapter receives the same chapter marks value so the rollup's
  // chapterMarksPoolForYearRows "all equal → use once" branch fires correctly.
  const withChapterMarks = injectChapterMarksIntoRows(merged, chapterMarksMap);
  const sorted = applyMarksOverridesToRows(
    withChapterMarks,
    (marksOverrides ?? []) as SyllabusMarksOverrideRow[],
  );
  const syllabusIdsForProgress = sorted.map((r) =>
    normalizeSyllabusMasterId(r.id),
  );
  const prog = await fetchUserMicrotopicProgressForSyllabusIds(
    supabase,
    userId,
    syllabusIdsForProgress,
  );
  const { rows: deduped, droppedToCanonical } =
    dedupeMergedSyllabusRowsByPlacement(sorted);
  const fullMap = progressRowsToMap(prog);
  const fullMapCoalesced = coalesceProgressByCanonicalIds(
    fullMap,
    droppedToCanonical,
  );
  const map = filterProgressToSyllabusIds(fullMapCoalesced, deduped);

  const primaryMarksYear = primaryMarksYearFromTargetExam(examLabel);
  return {
    examLabel,
    catalogExamKey: examKey,
    cohortKey: examKey,
    cuetDomainSubjects: domains,
    upscOptionalSubject: optionalSubject,
    rows: deduped,
    statusBySyllabusMasterId: map,
    primaryMarksYear,
  };
}

/**
 * Cohort for leaderboard must be defined for non–CUET-without-domains; CUET
 * with no domain selection has no meaningful cohort in our pipeline (empty rows).
 */
export function cohortKeyForLeaderboard(
  data: SyllabusDataForUserResult | null,
): string | null {
  if (!data?.cohortKey) return null;
  if (isCuetExam(data.examLabel) && data.cuetDomainSubjects.length === 0) {
    return null;
  }
  return data.cohortKey;
}
