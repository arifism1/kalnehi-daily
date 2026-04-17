import { isUpscCseMainsExam } from "@/lib/upscMainsOptionalSubjects";

/** Normalize exam labels for comparison. */
function normalizeExamLabel(exam: string): string {
  return exam.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

/**
 * Maps stored profile values to the canonical Profile dropdown label.
 * e.g. `JEE Main 2025` / `JEE Mains` → single option **JEE Main**.
 */
export function profileExamForDropdown(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const trimmed = raw.trim();
  const n = normalizeExamLabel(trimmed);

  if (n === "jee main" || n === "jee mains" || /^jee main (202[3-5])$/.test(n)) {
    return "JEE Main";
  }
  return trimmed;
}

/**
 * Short label for UI (matches `exams.display_name` for seeded exams).
 */
export function examDisplayLabel(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  const n = normalizeExamLabel(stored);
  if (n === "neet ug") return "NEET UG";
  if (n === "neet pg") return "NEET PG";
  if (
    n === "jee main" ||
    n === "jee mains" ||
    /^jee main \d{4}$/.test(n)
  ) {
    return "JEE Main";
  }
  if (n === "jee advanced") return "JEE Advanced";
  if (n === "gate") return "GATE";
  if (n === "cuet") return "CUET UG";
  if (n === "cbse class 12") return "CBSE Class 12";
  if (n === "upsc cse prelims") return "UPSC CSE Prelims";
  if (isUpscCseMainsExam(stored)) return "UPSC CSE Mains";
  if (n === "ca foundation") return "CA Foundation";
  if (n === "ca intermediate") return "CA Intermediate";
  if (n === "ca final") return "CA Final";
  if (n === "cat") return "CAT";
  if (n === "gmat") return "GMAT";
  if (n === "clat" || n === "clat ug") return "CLAT UG";
  if (n === "nda") return "NDA";
  if (n === "sat") return "SAT";
  if (n === "gre") return "GRE";
  if (n === "ini cet") return "INI-CET";
  if (n === "ipmat indore") return "IPMAT Indore";
  if (n === "ipmat rohtak") return "IPMAT Rohtak";
  if (n === "jipmat") return "JIPMAT";
  if (n === "other") return "Other";
  return stored.trim();
}

/**
 * Maps profile / UI strings to `syllabus_master.exam_name` (exact DB values).
 * NEET UG → `NEET UG`. **JEE Main** or **JEE Mains** (no year) → `JEE Main 2025`.
 */
export function syllabusCatalogExamName(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const n = normalizeExamLabel(trimmed);

  if (n === "neet ug") return "NEET UG";
  if (n === "neet pg") return "NEET PG";

  // Explicit "JEE Main YYYY" in DB / profile
  const jeeYear = trimmed.match(/^JEE\s+Main\s+(202[3-5])$/i);
  if (jeeYear) return `JEE Main ${jeeYear[1]}`;

  const jeeYearLoose = n.match(/^jee main (202[3-5])$/);
  if (jeeYearLoose) {
    return `JEE Main ${jeeYearLoose[1]}`;
  }

  // Generic JEE Main → current catalog (2025 data in `syllabus_master`)
  if (n === "jee main" || n === "jee mains") return "JEE Main 2025";

  if (n === "jee advanced") return "JEE Advanced";
  if (n === "gate") return "GATE";
  if (n === "cuet") return "CUET";
  if (n === "ini cet" || n === "ini cet exam") return "INI-CET";
  if (n === "cat") return "CAT";
  if (n === "gmat") return "GMAT";
  if (n === "clat" || n === "clat ug") return "CLAT UG";
  if (n === "nda") return "NDA";
  if (n === "sat") return "SAT";
  if (n === "gre") return "GRE";
  if (n === "ca intermediate") return "CA Intermediate";
  if (n === "ca final") return "CA Final";
  if (n === "other") return "Other";
  if (n === "cbse class 12") return "CBSE Class 12";
  if (n === "upsc cse prelims" || n === "upsc cse prelim") {
    return "UPSC CSE Prelims";
  }
  if (isUpscCseMainsExam(trimmed)) {
    return "UPSC CSE Mains";
  }
  if (n === "ca foundation") return "CA Foundation";
  if (n === "ipmat indore") return "IPMAT Indore";
  if (n === "ipmat rohtak") return "IPMAT Rohtak";
  if (n === "jipmat") return "JIPMAT";
  /** Legacy profile label → syllabus `exam_name`. */
  if (n === "cbse boards" || n === "boards") return "CBSE Class 12";

  return trimmed;
}

/** @deprecated Use syllabusCatalogExamName for DB filters. */
export function canonicalExamNameForDb(raw: string): string {
  return syllabusCatalogExamName(raw) ?? raw.trim();
}

/** Legacy: primary-first resolution. */
export function resolvePrimaryExam(profile: {
  primary_exam?: string | null;
  target_exam?: string | null;
} | null): string | null {
  const raw = profile?.primary_exam?.trim() || profile?.target_exam?.trim();
  return raw || null;
}

/**
 * User's target exam for syllabus + marks — prefers `target_exam`, then `primary_exam`.
 */
export function resolveSyllabusExam(profile: {
  primary_exam?: string | null;
  target_exam?: string | null;
} | null): string | null {
  const raw = profile?.target_exam?.trim() || profile?.primary_exam?.trim();
  return raw || null;
}

/**
 * Which `marks_20xx` column drives primary chapter pool, progress %, and main ring.
 * NEET UG / JEE Main 2025 → 2025; JEE Main 2024 → 2024; etc.
 */
export function primaryMarksYearFromTargetExam(
  exam: string | null | undefined,
): 2023 | 2024 | 2025 {
  if (!exam?.trim()) return 2025;
  const trimmed = exam.trim();
  const n = normalizeExamLabel(trimmed);

  if (n === "neet ug" || n === "neet pg") return 2025;

  const m = trimmed.match(/(\d{4})\s*$/);
  if (m) {
    const y = Number(m[1]);
    if (y === 2023) return 2023;
    if (y === 2024) return 2024;
    if (y === 2025) return 2025;
  }

  if (n.startsWith("jee main")) return 2025;

  if (n === "cuet") return 2025;

  return 2025;
}

/** Matches JEE Main (any session year). */
export function isJeeMainsExam(exam: string | null | undefined): boolean {
  if (!exam) return false;
  const n = normalizeExamLabel(exam);
  return (
    n === "jee main" ||
    n === "jee mains" ||
    /^jee main \d{4}$/.test(n)
  );
}

/** Matches "NEET UG". */
export function isNeetUgExam(exam: string | null | undefined): boolean {
  if (!exam) return false;
  return normalizeExamLabel(exam) === "neet ug";
}

/** Matches CUET (Common University Entrance Test). */
export function isCuetExam(exam: string | null | undefined): boolean {
  if (!exam) return false;
  return normalizeExamLabel(exam) === "cuet";
}

/** Max marks per CUET domain subject after normalisation (typical section scale). */
export const CUET_MARKS_PER_SUBJECT = 200;

export function cuetTotalMaxMarks(domainSubjectCount: number): number {
  return Math.max(0, domainSubjectCount) * CUET_MARKS_PER_SUBJECT;
}

/**
 * Maximum score for projected rings (720 NEET, 300 JEE Main, CUET: 200 × domain subjects).
 */
export function examScoreMax(
  exam: string | null | undefined,
  cuetDomainSubjectCount?: number,
): number {
  if (!exam) return 720;
  const n = normalizeExamLabel(exam);
  if (isCuetExam(exam)) {
    const c =
      cuetDomainSubjectCount != null && cuetDomainSubjectCount > 0
        ? cuetDomainSubjectCount
        : 0;
    return cuetTotalMaxMarks(c);
  }
  if (isJeeMainsExam(exam)) return 300;
  if (isNeetUgExam(exam)) return 720;
  if (n === "neet pg") return 800;
  if (n === "jee advanced") return 360;
  if (n === "cbse class 12") return 500;
  if (n === "ca foundation") return 400;
  if (n === "ca intermediate" || n === "ca final") return 800;
  if (n === "upsc cse prelims") return 400;
  /**
   * UPSC CSE Mains written maximum: merit 1750 + qualifying papers 600 = 2350.
   * Projection rings use this cap. Syllabus Mastery "Marks secured" denominator is
   * `rollup.totalMarksPool` (sum of chapter weights from loaded `syllabus_master` rows);
   * it aims at 2350 but may differ slightly if catalog weights use estimates/rounding.
   */
  if (isUpscCseMainsExam(exam)) return 2350;
  if (n === "gate") return 100;
  if (n === "ini cet") return 800;
  if (n === "cat") return 198;
  if (n === "gmat") return 805;
  if (n === "clat" || n === "clat ug") return 120;
  if (n === "nda") return 900;
  if (n === "sat") return 1600;
  if (n === "gre") return 340;
  if (n === "ipmat indore") return 300;
  if (n === "ipmat rohtak") return 300;
  if (n === "jipmat") return 400;
  return 720;
}

export function shouldShowSyllabusComingSoon(params: {
  examLabel: string | null | undefined;
  examLabelLoading: boolean;
  syllabusLoading: boolean;
  syllabusError: string | null;
  syllabusRowCount: number;
  /** CUET with no domain subjects yet — not a “missing catalog” state. */
  cuetAwaitingDomainSelection?: boolean;
}): boolean {
  const {
    examLabel,
    examLabelLoading,
    syllabusLoading,
    syllabusError,
    syllabusRowCount,
    cuetAwaitingDomainSelection,
  } = params;
  if (!examLabel?.trim() || examLabelLoading) return false;
  if (syllabusLoading || syllabusError) return false;
  if (cuetAwaitingDomainSelection) return false;
  return syllabusRowCount === 0;
}
