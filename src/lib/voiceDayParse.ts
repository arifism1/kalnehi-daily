/** Categories stored in DB — keep in sync with migration check constraint. */
export const VOICE_TIMELINE_CATEGORIES = [
  "study",
  "break",
  "personal",
  "exam_prep",
  "commute",
  "meal",
  "hygiene",
  "other",
] as const;

export type VoiceTimelineCategory = (typeof VOICE_TIMELINE_CATEGORIES)[number];

export type ParsedVoiceDayEntry = {
  title: string;
  description: string;
  category: VoiceTimelineCategory;
  subject: string | null;
  chapter: string | null;
  estimated_minutes: number | null;
};

function normalizeCategory(raw: string | undefined): VoiceTimelineCategory {
  const s = (raw ?? "other").toLowerCase().trim();
  if ((VOICE_TIMELINE_CATEGORIES as readonly string[]).includes(s)) {
    return s as VoiceTimelineCategory;
  }
  return "other";
}

export function normalizeParsedVoiceEntry(raw: unknown): ParsedVoiceDayEntry {
  if (!raw || typeof raw !== "object") {
    return {
      title: "Activity",
      description: "",
      category: "other",
      subject: null,
      chapter: null,
      estimated_minutes: null,
    };
  }
  const o = raw as Record<string, unknown>;
  const title =
    typeof o.title === "string" && o.title.trim() ? o.title.trim().slice(0, 200) : "Activity";
  const description =
    typeof o.description === "string" ? o.description.trim().slice(0, 4000) : "";
  const em = o.estimated_minutes;
  let estimated_minutes: number | null = null;
  if (typeof em === "number" && Number.isFinite(em) && em >= 0 && em <= 1440) {
    estimated_minutes = Math.round(em);
  }
  return {
    title,
    description,
    category: normalizeCategory(typeof o.category === "string" ? o.category : undefined),
    subject:
      typeof o.subject === "string" && o.subject.trim() ? o.subject.trim().slice(0, 200) : null,
    chapter:
      typeof o.chapter === "string" && o.chapter.trim() ? o.chapter.trim().slice(0, 200) : null,
    estimated_minutes,
  };
}
