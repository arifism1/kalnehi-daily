import type { SupabaseClient } from "@supabase/supabase-js";

import { DOUBT_GENERAL_SUBJECT } from "@/lib/doubtSubjects";
import {
  resolveSyllabusExam,
  syllabusCatalogExamName,
} from "@/lib/examProfile";
import {
  parseCuetDomainSubjectsJson,
  syllabusSubjectInCuetDomains,
} from "@/lib/cuetDomainSubjects";
import { fetchSyllabusMasterRowsForExam } from "@/lib/syllabusMasterQuery";
import type { Database } from "@/types/supabase";

export type DoubtVoiceTagSyllabusRow = {
  subject: string;
  chapter: string;
  microtopic: string;
};

export function formatDoubtTopicLine(
  chapter: string,
  microtopic: string,
): string {
  const c = chapter.trim();
  const m = microtopic.trim();
  return `${c} — ${m}`;
}

/** Normalize topic line for fuzzy match (dash variants, spacing, case). */
export function normTopicLineKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*[\u2013\u2014\u2212-]\s*/g, "—");
}

/**
 * Maps a suggested topic line onto a canonical value from `valid` (exact or
 * fuzzy dash/spacing/case). Returns null when no match.
 */
export function resolveTopicLineAgainstCatalog(
  suggested: string | null | undefined,
  valid: ReadonlySet<string>,
): string | null {
  const t = typeof suggested === "string" ? suggested.trim() : "";
  if (!t) return null;
  if (valid.has(t)) return t;
  const n = normTopicLineKey(t);
  for (const v of valid) {
    if (normTopicLineKey(v) === n) return v;
  }
  return null;
}

/** Fetch syllabus rows for the user's target exam (same rules as doubt subject hook). */
export async function fetchDoubtVoiceTagSyllabusRows(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ examKey: string | null; rows: DoubtVoiceTagSyllabusRow[] }> {
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("primary_exam, target_exam, cuet_domain_subjects, upsc_optional_subjects")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr) throw profileErr;

  const examLabel = resolveSyllabusExam(profile);
  const examKey = examLabel ? syllabusCatalogExamName(examLabel) : null;
  if (!examKey) {
    return { examKey: null, rows: [] };
  }

  const upscOptional = Array.isArray(profile?.upsc_optional_subjects)
    ? (profile.upsc_optional_subjects[0]?.trim() || null)
    : null;

  const fullRows = await fetchSyllabusMasterRowsForExam(
    supabase,
    examKey,
    upscOptional,
  );

  const rows: DoubtVoiceTagSyllabusRow[] = [];
  for (const r of fullRows) {
    const subject = typeof r.subject === "string" ? r.subject.trim() : "";
    if (!subject) continue;
    rows.push({
      subject,
      chapter: typeof r.chapter === "string" ? r.chapter.trim() : "",
      microtopic:
        typeof r.microtopic === "string" ? r.microtopic.trim() : "",
    });
  }

  const domains = parseCuetDomainSubjectsJson(profile?.cuet_domain_subjects);
  let filtered = rows;
  if (examKey === "CUET" && domains.length > 0) {
    filtered = rows.filter((r) =>
      syllabusSubjectInCuetDomains(r.subject, domains),
    );
  } else if (examKey === "CUET") {
    filtered = [];
  }

  return { examKey, rows: filtered };
}

export function buildDoubtVoiceTagSubjectList(
  rows: DoubtVoiceTagSyllabusRow[],
): string[] {
  const uniq = new Set<string>();
  for (const r of rows) {
    if (r.subject) uniq.add(r.subject);
  }
  const sorted = [...uniq].toSorted((a, b) => a.localeCompare(b));
  if (sorted.includes(DOUBT_GENERAL_SUBJECT)) return sorted;
  return [...sorted, DOUBT_GENERAL_SUBJECT];
}

/** All unique topic lines (chapter — microtopic) per row, for validation. */
export function allValidTopicLinesFromRows(
  rows: DoubtVoiceTagSyllabusRow[],
): Set<string> {
  const set = new Set<string>();
  for (const r of rows) {
    if (!r.chapter && !r.microtopic) continue;
    set.add(formatDoubtTopicLine(r.chapter, r.microtopic));
  }
  return set;
}

/**
 * Stratified slice for the LLM prompt: up to `perSubjectCap` lines per subject,
 * until `maxTotalLines` lines.
 */
export function buildTopicLinesForPrompt(
  rows: DoubtVoiceTagSyllabusRow[],
  opts: { perSubjectCap: number; maxTotalLines: number },
): string[] {
  const bySubject = new Map<string, DoubtVoiceTagSyllabusRow[]>();
  for (const r of rows) {
    if (!r.subject) continue;
    const list = bySubject.get(r.subject) ?? [];
    list.push(r);
    bySubject.set(r.subject, list);
  }

  const subjects = [...bySubject.keys()].toSorted((a, b) => a.localeCompare(b));
  const out: string[] = [];
  for (const sub of subjects) {
    const list = bySubject.get(sub) ?? [];
    let n = 0;
    for (const r of list) {
      if (n >= opts.perSubjectCap) break;
      const line = formatDoubtTopicLine(r.chapter, r.microtopic);
      if (!line.trim() || line === " — ") continue;
      out.push(line);
      n++;
      if (out.length >= opts.maxTotalLines) return out;
    }
  }
  return out;
}
