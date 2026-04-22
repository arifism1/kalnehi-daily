import { EXAM_SITEMAP_PATHS } from "@/lib/sitemap-data";

export type InternalLinksEntry = {
  relatedPosts?: string[];
  relatedExams?: string[];
  relatedFeatures?: string[];
};

const DEFAULT_POSTS = [
  "how-toppers-track-syllabus",
  "ai-study-planner-india",
  "spaced-repetition-competitive-exams-india",
] as const;

const DEFAULT_EXAMS = ["/jee", "/neet", "/upsc"] as const;
const DEFAULT_FEATURES = ["/features/prepbrain-ai", "/features/syllabus-tracker", "/features/spaced-revision"] as const;

const FEATURE_OVERRIDES: Record<string, InternalLinksEntry> = {
  "/features/prepbrain-ai": {
    relatedExams: ["/jee", "/neet", "/upsc"],
    relatedPosts: ["ai-study-planner-india", "how-toppers-track-syllabus", "doubt-tracking-system-exam-prep"],
  },
  "/features/syllabus-tracker": {
    relatedExams: ["/jee", "/neet", "/cat"],
    relatedPosts: ["how-toppers-track-syllabus", "neet-syllabus-tracker-strategy", "class-12-boards-jee-neet-balance"],
  },
  "/features/voice-control": {
    relatedExams: ["/jee", "/neet", "/upsc"],
    relatedPosts: ["voice-study-planning-why-it-works", "how-toppers-track-syllabus"],
  },
  "/features/spaced-revision": {
    relatedExams: ["/jee", "/upsc", "/gate"],
    relatedPosts: ["spaced-repetition-competitive-exams-india", "study-consistency-vs-long-hours"],
  },
  "/features/marks-engine": {
    relatedExams: ["/jee", "/cat", "/gate"],
    relatedPosts: ["ai-study-planner-india", "gate-preparation-daily-plan", "doubt-tracking-system-exam-prep"],
  },
  "/features/doubt-tracker": {
    relatedExams: ["/neet", "/jee", "/upsc"],
    relatedPosts: ["doubt-tracking-system-exam-prep", "how-toppers-track-syllabus"],
  },
  "/features/daily-planner": {
    relatedExams: ["/upsc", "/jee", "/neet"],
    relatedPosts: ["upsc-daily-study-routine", "ai-study-planner-india", "how-to-make-daily-study-timetable-jee"],
  },
  "/features/study-timer": {
    relatedExams: ["/jee", "/neet", "/cat"],
    relatedPosts: ["how-to-make-daily-study-timetable-jee", "study-consistency-vs-long-hours"],
  },
  "/features/consistency-tracker": {
    relatedExams: ["/upsc", "/jee", "/neet"],
    relatedPosts: ["upsc-consistency-more-important-than-hours", "study-consistency-vs-long-hours"],
  },
  "/features/on-camera-study": {
    relatedExams: ["/neet", "/jee", "/cat"],
    relatedPosts: ["class-12-boards-jee-neet-balance", "how-toppers-track-syllabus"],
  },
  "/features/habit-maker": {
    relatedExams: ["/jee", "/neet", "/upsc"],
    relatedPosts: ["jee-dropper-study-plan", "study-consistency-vs-long-hours"],
  },
  "/features/daily-log": {
    relatedExams: ["/jee", "/neet", "/gate"],
    relatedPosts: ["how-toppers-track-syllabus", "gate-preparation-daily-plan"],
  },
};

const EXAM_OVERRIDES: Record<string, InternalLinksEntry> = {
  "/jee": {
    relatedPosts: ["how-to-make-daily-study-timetable-jee", "jee-dropper-study-plan", "how-toppers-track-syllabus"],
    relatedFeatures: ["/features/syllabus-tracker", "/features/prepbrain-ai", "/features/spaced-revision"],
  },
  "/neet": {
    relatedPosts: ["how-many-hours-neet-aspirant-study", "neet-syllabus-tracker-strategy", "how-toppers-track-syllabus"],
    relatedFeatures: ["/features/syllabus-tracker", "/features/prepbrain-ai", "/features/doubt-tracker"],
  },
  "/upsc": {
    relatedPosts: ["upsc-consistency-more-important-than-hours", "upsc-daily-study-routine", "doubt-tracking-system-exam-prep"],
    relatedFeatures: ["/features/prepbrain-ai", "/features/daily-planner", "/features/spaced-revision"],
  },
  "/cat": {
    relatedPosts: ["ai-study-planner-india", "study-consistency-vs-long-hours", "how-toppers-track-syllabus"],
    relatedFeatures: ["/features/marks-engine", "/features/prepbrain-ai", "/features/daily-planner"],
  },
  "/gate": {
    relatedPosts: ["gate-preparation-daily-plan", "study-consistency-vs-long-hours", "spaced-repetition-competitive-exams-india"],
    relatedFeatures: ["/features/syllabus-tracker", "/features/prepbrain-ai", "/features/spaced-revision"],
  },
};

const ALL_FEATURE_PATHS = [
  "/features/prepbrain-ai",
  "/features/voice-control",
  "/features/syllabus-tracker",
  "/features/spaced-revision",
  "/features/marks-engine",
  "/features/study-timer",
  "/features/consistency-tracker",
  "/features/doubt-tracker",
  "/features/daily-planner",
  "/features/on-camera-study",
  "/features/habit-maker",
  "/features/daily-log",
] as const;

function buildMap(): Record<string, InternalLinksEntry> {
  const o: Record<string, InternalLinksEntry> = { ...EXAM_OVERRIDES };
  for (const p of EXAM_SITEMAP_PATHS) {
    if (!o[p]) {
      o[p] = { relatedPosts: [...DEFAULT_POSTS], relatedFeatures: [...DEFAULT_FEATURES] };
    }
  }
  for (const p of ALL_FEATURE_PATHS) {
    o[p] = FEATURE_OVERRIDES[p] ?? {
      relatedExams: [...DEFAULT_EXAMS],
      relatedPosts: [...DEFAULT_POSTS],
    };
  }
  return o;
}

export const INTERNAL_LINKS: Record<string, InternalLinksEntry> = buildMap();

export function getInternalLinks(pathname: string): InternalLinksEntry | undefined {
  return INTERNAL_LINKS[pathname];
}
