export type TourGroup = "power" | "workflow" | null;

export type TourStep = {
  /** Unique identifier for the step. */
  id: string;
  /** Which narrative group this step belongs to (null = full-screen standalone). */
  group: TourGroup;
  /** value of `data-tour` attribute on the DOM element to spotlight, or null for full-screen steps. */
  tourTarget: string | null;
  title: string;
  description: string;
};

/**
 * 14-step tour:
 *  Step 0  — Welcome modal (full-screen, no spotlight)
 *  Steps 1–5  — Group 1: The Power Features
 *  Steps 6–12 — Group 2: The Workflow Engine
 *  Step 13 — Celebration (full-screen, no spotlight)
 */
export const TOUR_STEPS: TourStep[] = [
  // ── Step 0: Welcome ──────────────────────────────────────────────────────
  {
    id: "welcome",
    group: null,
    tourTarget: null,
    title: "Welcome to Kalnehi Daily",
    description:
      "Here's what makes Kalnehi different from every other study app. We'll walk you through 12 tools in under 2 minutes.",
  },

  // ── Group 1: The Power Features ──────────────────────────────────────────
  {
    id: "marks-engine",
    group: "power",
    // Marks Engine lives at /marks-engine — no dedicated home grid card, so no spotlight.
    // TourStepCard still renders over the dark overlay (group: "power").
    tourTarget: null,
    title: "Marks Engine & Predictions",
    description:
      "Predicts your exam score using real weightage data — before the exam. Converts anxiety into a number you can actually act on.",
  },
  {
    id: "target-score-blueprint",
    group: "power",
    tourTarget: "target-score-blueprint",
    title: "Target Score Blueprint",
    description:
      "Ranks every chapter by 'payload' — so you always know exactly which topics to hit first to reach your target score.",
  },
  {
    id: "prepbrain-ai",
    group: "power",
    tourTarget: "prepbrain-ai",
    title: "Mastermind AI",
    description:
      "Your strategic tutor. It answers questions based on your specific syllabus coverage and weak spots — not generic answers.",
  },
  {
    id: "voice-dictation",
    group: "power",
    tourTarget: "voice",
    title: "AI Voice Dictation",
    description:
      "Structure your entire day or add tasks in seconds using your voice. No typing, no friction — your plan is always up to date.",
  },
  {
    id: "syllabus-tracker",
    group: "power",
    tourTarget: "syllabus-tracker",
    title: "Syllabus Tracker",
    description:
      "Tracks every subject down to the microtopic level. Massive exams need granular visibility — this gives it to you.",
  },

  // ── Group 2: The Workflow Engine ─────────────────────────────────────────
  {
    id: "backlog-tracker",
    group: "workflow",
    tourTarget: "backlog-tracker",
    title: "Backlog List & Tracker",
    description:
      "Captures everything you 'owe' yourself. Schedule it later instead of feeling overwhelmed — nothing falls through the cracks.",
  },
  {
    id: "missed-tasks",
    group: "workflow",
    tourTarget: "missed-tasks",
    title: "Missed Tasks",
    description:
      "Automatically collects unfinished work so you can drag it to a real date — no more guilt-stashing half-done chapters.",
  },
  {
    id: "mock-test-tracker",
    group: "workflow",
    tourTarget: "mock-test-tracker",
    title: "Mock Test Tracker",
    description:
      "Logs every paper with subject-wise marks. This feeds the Marks Engine's predictions, so the more you log, the sharper it gets.",
  },
  {
    id: "revision-tracker",
    group: "workflow",
    tourTarget: "revision-tracker",
    title: "Revision Tracker",
    description:
      "Replaces vague 'revise later' promises with a dated queue linked directly to your syllabus. Revision actually happens.",
  },
  {
    id: "dictate-my-day",
    group: "workflow",
    tourTarget: "dictate-my-day",
    title: "Dictate My Day + Self Type",
    description:
      "Two ways to get your plan in — voice or text. Flexibility means your plan exists every single day, not just when you feel like it.",
  },
  {
    id: "timer",
    group: "workflow",
    tourTarget: "timer",
    title: "Focus Timer",
    description:
      "Tracks real minutes per subject. Keeps you honest and prevents the mid-afternoon energy crash from going unnoticed.",
  },
  {
    id: "progress",
    group: "workflow",
    tourTarget: "progress",
    title: "Progress Tracker",
    description:
      "Shows your weekly position against anonymous peer cohorts. A competitive reality check that makes the grind feel real.",
  },

  // ── Step 13: Celebration ─────────────────────────────────────────────────
  {
    id: "celebration",
    group: null,
    tourTarget: null,
    title: "You're all set.",
    description: "Every tool is ready. Let's start your first day.",
  },
];

export const TOTAL_STEPS = TOUR_STEPS.length; // 14

/** Steps that are purely full-screen (no spotlight). */
export const FULLSCREEN_STEP_INDICES = new Set(
  TOUR_STEPS.flatMap((s, i) => (s.tourTarget === null ? [i] : [])),
);

/** Steps belonging to Group 1 (power features), used for the segmented progress bar. */
export const POWER_STEP_INDICES: number[] = TOUR_STEPS.flatMap((s, i) =>
  s.group === "power" ? [i] : [],
);

/** Steps belonging to Group 2 (workflow), used for the segmented progress bar. */
export const WORKFLOW_STEP_INDICES: number[] = TOUR_STEPS.flatMap((s, i) =>
  s.group === "workflow" ? [i] : [],
);
