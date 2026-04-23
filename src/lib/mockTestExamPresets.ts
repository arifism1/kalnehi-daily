import { syllabusCatalogExamName } from "@/lib/examProfile";
import { EXAMS_CATALOG_FALLBACK, type ExamCatalogRow } from "@/lib/examsCatalog";
import { isUpscCseMainsExam, UPSC_CSE_MAINS_UI_TOTAL_MARKS } from "@/lib/upscMainsOptionalSubjects";

export type MockScoreType = "raw" | "percentage" | "percentile";

/**
 * UI defaults for the Log Mock Test sheet — derived from the user’s
 * `syllabus_master.exam_name` (via profile → catalog mapping).
 * Keeps the form exam-agnostic at the data layer; only labels & defaults are exam-specific.
 */
export type MockTestExamUiPreset = {
  /** Canonical `exams.exam_name` / `mock_tests.exam_name` */
  catalogExamName: string;
  /** Short label in the sheet header (matches catalog display where possible) */
  displayLabel: string;
  defaultScoreType: MockScoreType;
  /** For raw / % total row — from catalog `max_score` when set */
  defaultMaxTotal: number | null;
  /** Hint under the score type row */
  scoringHint: string;
  testNamePlaceholder: string;
  durationPlaceholder: string;
  suggestedDurationMinutes: number | null;
  exampleTotal: string;
  exampleMax: string;
  /** If true, nudge user toward percentile (CAT-style mocks). Still allow switching. */
  preferPercentile: boolean;
};

function normalizeKey(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  return (syllabusCatalogExamName(raw.trim()) ?? raw.trim()).trim();
}

function findCatalogRow(mappedKey: string): ExamCatalogRow | null {
  if (!mappedKey) return null;
  const byName = EXAMS_CATALOG_FALLBACK.find((r) => r.exam_name === mappedKey);
  if (byName) return byName;
  return null;
}

/** Exams in our catalog where mocks are most often reported as percentiles. */
const PERCENTILE_DEFAULT_EXAM_NAMES = new Set(["CAT", "GMAT", "XAT", "SNAP", "NMAT"]);

function inferDefaultScoreType(examName: string): MockScoreType {
  if (PERCENTILE_DEFAULT_EXAM_NAMES.has(examName)) return "percentile";
  return "raw";
}

function displayLabelFor(row: ExamCatalogRow | null, mappedKey: string, rawInput: string): string {
  if (row) return row.display_name.trim() || row.exam_name;
  if (rawInput.trim()) return rawInput.trim();
  return mappedKey || "Your exam";
}

/**
 * Suggested per-subject max (raw) for common patterns; empty string = no default.
 * Matches syllabus subject labels from the user’s exam (e.g. "Physics (Class 11)").
 */
export function getSuggestedSubjectMaxMarks(
  catalogExamName: string | null | undefined,
  subjectLabel: string,
): string {
  const key = normalizeKey(catalogExamName ?? null);
  const s = subjectLabel.toLowerCase();

  if (key === "NEET UG") {
    if (s.includes("physics")) return "180";
    if (s.includes("chemistry")) return "180";
    if (s.includes("biology") || s.includes("botany") || s.includes("zoology")) return "360";
  }

  if (key.startsWith("JEE Main") && !key.includes("Advanced")) {
    if (s.includes("physics") || s.includes("chemistry") || s.includes("math")) return "100";
  }

  if (key === "JEE Advanced") {
    if (s.includes("physics") || s.includes("chemistry") || s.includes("math")) return "120";
  }

  return "";
}

export function getMockTestUiPreset(storedProfileExam: string | null | undefined): MockTestExamUiPreset {
  const raw = storedProfileExam?.trim() ?? "";
  const mappedKey = normalizeKey(raw) || (raw || "");
  const row = findCatalogRow(mappedKey) ?? (raw ? findCatalogRow(syllabusCatalogExamName(raw) ?? "") : null);
  const catalogExamName = (row?.exam_name ?? mappedKey) || raw || "Other";
  const displayLabel = displayLabelFor(row, mappedKey, raw);
  const maxFromCatalog = row?.max_score ?? null;

  const defaultScoreType = inferDefaultScoreType(row?.exam_name ?? mappedKey);
  const preferPercentile = defaultScoreType === "percentile";

  // Duration: common exam patterns (minutes)
  let suggestedDuration: number | null = null;
  if (row?.exam_name === "NEET UG" || row?.exam_name === "NEET PG") {
    suggestedDuration = 200;
  } else if (
    row?.exam_name === "JEE Main 2025" ||
    (mappedKey.startsWith("JEE Main") && !mappedKey.includes("Advanced"))
  ) {
    suggestedDuration = 180;
  } else if (row?.exam_name === "JEE Advanced") {
    suggestedDuration = 180;
  } else if (row?.exam_name === "CAT") {
    suggestedDuration = 120;
  } else if (isUpscCseMainsExam(row?.exam_name) || isUpscCseMainsExam(mappedKey)) {
    suggestedDuration = 180;
  }

  // Hints
  let scoringHint =
    "Choose Raw for marks out of a fixed total, Percentile for normalized scores, or Percentage (0–100).";
  if (preferPercentile) {
    scoringHint =
      "For this exam, mocks are usually reported as percentiles. You can still switch to Raw or Percentage if your institute uses a different format.";
  } else if (row?.exam_name === "NEET UG") {
    scoringHint =
      "NEET UG: 720 total · Physics 180, Chemistry 180, Biology 360. Step 2 can pre-fill subject caps.";
  } else if (row?.exam_name === "NEET PG") {
    scoringHint =
      "NEET PG: mock totals vary by session — use Max score to match the paper you attempted.";
  } else if (row?.exam_name === "JEE Main 2025" || mappedKey.startsWith("JEE Main")) {
    scoringHint = "JEE Main: 300 total (typically 100 per subject in PCM).";
  } else if (isUpscCseMainsExam(row?.exam_name) || isUpscCseMainsExam(mappedKey)) {
    scoringHint = `UPSC CSE Mains: complex scoring across papers. Total merit max is often discussed as ${UPSC_CSE_MAINS_UI_TOTAL_MARKS} — use Raw to match the total you track.`;
  } else if (row?.max_score == null || row?.exam_name === "CUET" || row?.exam_name === "Other") {
    scoringHint = "Set Max score to match the mock you attempted (institute- or year-specific if needed).";
  }

  // Placeholders
  let exampleTotal = "580";
  let exampleMax = maxFromCatalog != null ? String(maxFromCatalog) : "720";
  if (defaultScoreType === "percentile") {
    exampleTotal = "99.2";
    exampleMax = "";
  } else if (maxFromCatalog != null) {
    exampleTotal = String(Math.round(maxFromCatalog * 0.8));
    exampleMax = String(maxFromCatalog);
  }

  // Test name: coaching patterns
  let testNamePlaceholder = "e.g. Allen / FIITJEE / Resonance full syllabus test";
  if (row?.exam_name === "NEET UG" || row?.exam_name === "NEET PG") {
    testNamePlaceholder = "e.g. Allen major test, NTA Abhyas mock, Aakash AIATS";
  } else if (row?.exam_name === "JEE Main 2025" || mappedKey.startsWith("JEE Main")) {
    testNamePlaceholder = "e.g. NTA mock, Allen JEE (Main) test series";
  } else if (row?.exam_name === "CAT") {
    testNamePlaceholder = "e.g. SIMCAT, AIMCAT, TIME mock";
  } else if (isUpscCseMainsExam(row?.exam_name) || isUpscCseMainsExam(mappedKey)) {
    testNamePlaceholder = "e.g. Test series mock, past-year timed practice";
  }

  return {
    catalogExamName,
    displayLabel,
    defaultScoreType,
    defaultMaxTotal: defaultScoreType === "percentile" ? null : maxFromCatalog,
    scoringHint,
    testNamePlaceholder,
    durationPlaceholder: suggestedDuration != null ? String(suggestedDuration) : "180",
    suggestedDurationMinutes: suggestedDuration,
    exampleTotal,
    exampleMax: defaultScoreType === "percentile" ? "" : exampleMax,
    preferPercentile,
  };
}

/**
 * `exam_name` to persist on `mock_tests` — always canonical catalog key when possible.
 */
export function mockTestPersistExamName(storedProfileExam: string | null | undefined): string {
  const p = getMockTestUiPreset(storedProfileExam);
  return p.catalogExamName;
}
