/**
 * VerticalConfig system — the single source of truth for everything that differs
 * between brands (Kalnehi students, FIZAKI sales reps, future verticals).
 *
 * The ENGINE (`src/engine/**`) never imports this file. It exposes domain-agnostic
 * primitives; the words, brand, feature toggles, roles, and default content all come
 * from a VerticalConfig resolved per request (by host) or per build (NEXT_PUBLIC_VERTICAL).
 *
 * Adding a new vertical = add a config object that fills EVERY field below. Because
 * `CopyPack` is a fully-required record, a missing term is a compile error, not a
 * silent fallback to another brand's wording.
 */

export type VerticalId = "kalnehi" | "fizaki";

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
  | "brain-yoga"
  // FIZAKI-only surfaces
  | "playbook-import"
  | "daily-practice"
  | "post-call-debrief"
  | "quota-gap-planner"
  | "pipeline"
  | "manager-dashboard"
  | "ramp-attribution";

/**
 * User-facing wording for each engine primitive. Pure data — no student/sales term
 * may appear outside the matching vertical's pack (enforced by the leakage test).
 */
export interface CopyPack {
  /** Audience noun, e.g. "student" / "rep". */
  audienceNoun: string;
  audienceNounPlural: string;

  /** KnowledgeTree: nested masterable units. */
  knowledgeTreeLabel: string; // "Syllabus" / "Playbook"
  knowledgeBranchLabel: string; // "Chapter" / "Module"
  knowledgeLeafLabel: string; // "Microtopic" / "Skill"
  knowledgeLeafLabelPlural: string;

  /** OutcomeMetric: weighted target. */
  outcomeMetricLabel: string; // "Marks" / "Quota"
  outcomeUnit: string; // "marks" / "quota"
  projectedOutcomeLabel: string; // "Projected marks" / "Projected quota readiness"

  /** GapPlanner: max payoff/effort planner. */
  gapPlannerLabel: string; // "Target Score Blueprint" / "Quota-Gap Planner"

  /** Other primitives. */
  dailyPlanLabel: string; // "Daily Plan" / "Daily Practice"
  revisionLabel: string; // "Revision" / "Reinforcement"
  assessmentLabel: string; // "Mock Test" / "Role-play"
  mistakeLogLabel: string; // "Mistake Log" / "Lost-deal Log"
  queryTrackerLabel: string; // "Doubts" / "Deal Questions"
  coachName: string; // "Mastermind" / "FIZAKI Coach"
  debriefLabel: string; // "Daily Debrief" / "Post-call Debrief"
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

export type VerticalRole =
  | "student"
  | "faculty"
  | "parent"
  | "rep"
  | "manager"
  | "admin";

export interface VerticalConfig {
  id: VerticalId;
  brand: VerticalBrand;
  copy: CopyPack;
  /** Feature toggles. Absent id = use engine default (off for safety in FIZAKI). */
  features: Partial<Record<FeatureId, boolean>>;
  roles: readonly VerticalRole[];
  /** Post-login landing path for this vertical. */
  defaultHomePath: string;
}
