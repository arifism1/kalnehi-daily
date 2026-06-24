/**
 * VerticalConfig system — Kalnehi branding, copy, feature flags, and roles.
 *
 * The ENGINE (`src/engine/**`) never imports this file. It exposes domain-agnostic
 * primitives; the words, brand, feature toggles, roles, and default content all come
 * from VerticalConfig resolved per request (by host) or per build (NEXT_PUBLIC_VERTICAL).
 */

export type VerticalId = "kalnehi";

/** Canonical engine feature ids (mirror `src/lib/dashboardFeatures.ts`). */
export type FeatureId =
  | "daily-planner"
  | "dictate-my-day"
  | "timer"
  | "missed-tasks"
  | "daily-debrief"
  | "shareable-recap"
  | "saved-daily-plans"
  | "consistency-tracker"
  | "mock-test-tracker"
  | "progress"
  | "syllabus-tracker"
  | "backlogs"
  | "target-score-blueprint"
  | "my-target"
  | "prepbrain-ai"
  | "revision-tracker"
  | "doubt-tracker"
  | "mistake-log"
  | "study-squad"
  | "study-sessions"
  | "habit-maker"
  | "personal-motivation"
  | "brain-yoga";

/**
 * User-facing wording for each engine primitive. Pure data — no student/sales term
 * may appear outside the matching vertical's pack (enforced by the leakage test).
 */
export interface CopyPack {
  /** Audience noun, e.g. "student". */
  audienceNoun: string;
  audienceNounPlural: string;

  /** KnowledgeTree: nested masterable units. */
  knowledgeTreeLabel: string; // "Syllabus"
  knowledgeBranchLabel: string; // "Chapter"
  knowledgeLeafLabel: string; // "Microtopic"
  knowledgeLeafLabelPlural: string;

  /** OutcomeMetric: weighted target. */
  outcomeMetricLabel: string; // "Marks"
  outcomeUnit: string; // "marks"
  projectedOutcomeLabel: string; // "Projected marks"

  /** GapPlanner: max payoff/effort planner. */
  gapPlannerLabel: string; // "Target Score Blueprint"

  /** Other primitives. */
  dailyPlanLabel: string; // "Daily Plan"
  revisionLabel: string; // "Revision"
  assessmentLabel: string; // "Mock Test"
  mistakeLogLabel: string; // "Mistake Log"
  queryTrackerLabel: string; // "Doubts"
  coachName: string; // "Mastermind"
  debriefLabel: string; // "Daily Debrief"
}

export interface VerticalTheme {
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  /** Capacitor/PWA status bar style. */
  statusBarStyle: "Dark" | "Light";
}

export interface VerticalBrand {
  /** Full product name (SEO, manifest, browser tab). */
  productName: string;
  /** Short label for tight UI / installed PWA. */
  shortName: string;
  tagline: string;
  /** Canonical production host, no protocol. */
  domain: string;
  supportEmail: string;
  theme: VerticalTheme;
}

export type VerticalRole = "student" | "faculty" | "parent" | "admin";

export interface VerticalConfig {
  id: VerticalId;
  brand: VerticalBrand;
  copy: CopyPack;
  /** Feature toggles. Absent id = use engine default (off). */
  features: Partial<Record<FeatureId, boolean>>;
  roles: readonly VerticalRole[];
  /** Post-login landing path for this vertical. */
  defaultHomePath: string;
}
