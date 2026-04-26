/**
 * Exam Tracks — static configuration.
 *
 * `examNames` contains `syllabus_master.exam_name` / `exams.exam_name` DB keys.
 * The UI always resolves display labels via `displayNameForExamCatalog()` so
 * year-suffixed keys like "JEE Main 2025" render as "JEE Main".
 */
export type ExamTrack = {
  /** Stable identifier stored in `user_profiles.selected_track`. */
  id: string;
  /** Human-readable track name shown in onboarding and profile. */
  name: string;
  /** Ordered list of DB `exam_name` keys that belong to this track. */
  examNames: string[];
};

export const EXAM_TRACKS: ExamTrack[] = [
  { id: "jee", name: "JEE Track", examNames: ["JEE Main 2025", "JEE Advanced"] },
  { id: "gate", name: "GATE Track", examNames: ["GATE"] },
  { id: "neet_ug", name: "NEET UG Track", examNames: ["NEET UG"] },
  { id: "medical_pg", name: "Medical PG Track", examNames: ["INI-CET", "NEET PG"] },
  {
    id: "management_ug",
    name: "Management UG Track",
    examNames: ["IPMAT Indore", "JIPMAT", "IPMAT Rohtak"],
  },
  { id: "management_pg", name: "Management PG Track", examNames: ["CAT", "GMAT"] },
  {
    id: "ca",
    name: "CA Track",
    examNames: ["CA Foundation", "CA Intermediate", "CA Final"],
  },
  { id: "law", name: "Law Track", examNames: ["CLAT UG"] },
  {
    id: "upsc",
    name: "UPSC Track",
    examNames: ["UPSC CSE Prelims", "UPSC CSE Mains"],
  },
  { id: "defense", name: "Defense Track", examNames: ["NDA"] },
  { id: "ssc", name: "SSC Track", examNames: ["SSC CHSL", "SSC CGL"] },
  { id: "banking", name: "Banking Track", examNames: ["IBPS PO", "SBI PO"] },
  { id: "cbse", name: "CBSE Track", examNames: ["CBSE Class 12"] },
  { id: "abroad", name: "Abroad Track", examNames: ["SAT", "GRE"] },
  { id: "cuet", name: "CUET Track", examNames: ["CUET"] },
];

/** Returns the track whose `examNames` contains `examName`, or `null`. */
export function trackForExamName(examName: string): ExamTrack | null {
  return EXAM_TRACKS.find((t) => t.examNames.includes(examName)) ?? null;
}

/** Returns the track with the given `id`, or `null`. */
export function trackById(id: string): ExamTrack | null {
  return EXAM_TRACKS.find((t) => t.id === id) ?? null;
}
