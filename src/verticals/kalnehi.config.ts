/**
 * Kalnehi (students) vertical config.
 *
 * Brand literals MUST mirror the existing single-source constants
 * (`src/lib/seo-metadata.ts`, `src/lib/branding.ts`, `src/config/appRoutes.ts`).
 * `src/verticals/verticalConfig.test.ts` asserts they stay in sync so this never drifts.
 *
 * Copy here is the student/exam wording. NO sales wording may appear in this pack.
 */
import type { VerticalConfig } from "./types";

export const kalnehiConfig: VerticalConfig = {
  id: "kalnehi",
  brand: {
    productName: "Kalnehi Daily",
    shortName: "Kalnehi",
    tagline: "Voice-first exam prep tracker",
    domain: "www.kalnehi.com",
    supportEmail: "curioversitylearning@gmail.com",
    theme: {
      primaryColor: "#FF7A00",
      backgroundColor: "#FAF7F2",
      accentColor: "#FAF7F2",
      statusBarStyle: "Dark",
    },
  },
  copy: {
    audienceNoun: "student",
    audienceNounPlural: "students",
    knowledgeTreeLabel: "Syllabus",
    knowledgeBranchLabel: "Chapter",
    knowledgeLeafLabel: "Microtopic",
    knowledgeLeafLabelPlural: "Microtopics",
    outcomeMetricLabel: "Marks",
    outcomeUnit: "marks",
    projectedOutcomeLabel: "Projected marks",
    gapPlannerLabel: "Target Score Blueprint",
    dailyPlanLabel: "Daily Plan",
    revisionLabel: "Revision",
    assessmentLabel: "Mock Test",
    mistakeLogLabel: "Mistake Log",
    queryTrackerLabel: "Doubts",
    coachName: "Mastermind",
    debriefLabel: "Daily Debrief",
  },
  // Kalnehi keeps every existing student feature enabled (current behavior).
  features: {
    "daily-planner": true,
    "dictate-my-day": true,
    timer: true,
    "missed-tasks": true,
    "daily-debrief": true,
    "shareable-recap": true,
    "saved-daily-plans": true,
    "consistency-tracker": true,
    "mock-test-tracker": true,
    progress: true,
    "syllabus-tracker": true,
    backlogs: true,
    "target-score-blueprint": true,
    "my-target": true,
    "prepbrain-ai": true,
    "revision-tracker": true,
    "doubt-tracker": true,
    "mistake-log": true,
    "study-squad": true,
    "study-sessions": true,
    "habit-maker": true,
    "personal-motivation": true,
    "brain-yoga": true,
  },
  roles: ["student", "faculty", "parent", "admin"],
  defaultHomePath: "/syllabus",
};
