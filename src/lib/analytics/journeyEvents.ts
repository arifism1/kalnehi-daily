/**
 * Stable journey event action names for user_activity_logs + milestone processing.
 */

export const JourneyAction = {
  APP_OPENED: "app_opened",
  PAGE_VIEW: "page_view",
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP: "onboarding_step",
  EXAM_SELECTED: "exam_selected",
  ONBOARDING_COMPLETED: "onboarding_completed",
  CURRENT_SCORE_ENTERED: "current_score_entered",
  TARGET_SCORE_ENTERED: "target_score_entered",
  FIRST_AI_INSIGHT: "first_ai_insight_generated",
  FIRST_STUDY_SESSION: "first_study_session_started",
  FIRST_TASK: "first_task_created",
  FIRST_CHAPTER_MARKED: "first_chapter_marked",
  FIRST_SYLLABUS_MARKS_RAISE: "first_syllabus_marks_raise",
  FIRST_REVISION: "first_revision_scheduled",
  FIRST_MOCK: "first_mock_logged",
  SYLLABUS_TRACKER_OPENED: "syllabus_tracker_opened",
  MASTERMIND_OPENED: "mastermind_opened",
  PLANNER_OPENED: "planner_opened",
  TIMER_STARTED: "timer_started",
  TIMER_COMPLETED: "timer_completed",
  BACKLOG_OPENED: "backlog_opened",
  REVISION_TRACKER_OPENED: "revision_tracker_opened",
  MOCK_TRACKER_OPENED: "mock_tracker_opened",
  AI_CHAT_SENT: "ai_chat_sent",
  TASK_CREATED: "task_created",
  TASK_COMPLETED: "task_completed",
  VOICE_INSTRUCTION: "voice_instruction",
} as const;

export type JourneyActionName = (typeof JourneyAction)[keyof typeof JourneyAction];

/** Pathname prefix → feature-open action (first visit per session handled in ActivityTracker). */
export const PATH_FEATURE_OPEN: { prefix: string; action: JourneyActionName; feature: string }[] = [
  { prefix: "/syllabus", action: JourneyAction.SYLLABUS_TRACKER_OPENED, feature: "syllabus" },
  { prefix: "/mastermind", action: JourneyAction.MASTERMIND_OPENED, feature: "prepbrain" },
  { prefix: "/prepbrain", action: JourneyAction.MASTERMIND_OPENED, feature: "prepbrain" },
  { prefix: "/daily-plan", action: JourneyAction.PLANNER_OPENED, feature: "planner" },
  { prefix: "/backlogs", action: JourneyAction.BACKLOG_OPENED, feature: "backlog" },
  { prefix: "/revision-tracker", action: JourneyAction.REVISION_TRACKER_OPENED, feature: "revision" },
  { prefix: "/mock-tests", action: JourneyAction.MOCK_TRACKER_OPENED, feature: "mock" },
];

export function featureOpenForPath(pathname: string): {
  action: JourneyActionName;
  feature: string;
} | null {
  for (const row of PATH_FEATURE_OPEN) {
    if (pathname === row.prefix || pathname.startsWith(`${row.prefix}/`)) {
      return { action: row.action, feature: row.feature };
    }
  }
  return null;
}

/** Actions that trigger idempotent milestone columns in user_journey_state. */
export const MILESTONE_ACTIONS = new Set<string>([
  JourneyAction.APP_OPENED,
  JourneyAction.ONBOARDING_STARTED,
  JourneyAction.ONBOARDING_COMPLETED,
  JourneyAction.EXAM_SELECTED,
  JourneyAction.CURRENT_SCORE_ENTERED,
  JourneyAction.TARGET_SCORE_ENTERED,
  JourneyAction.FIRST_AI_INSIGHT,
  JourneyAction.AI_CHAT_SENT,
  JourneyAction.FIRST_STUDY_SESSION,
  JourneyAction.FIRST_TASK,
  JourneyAction.TASK_CREATED,
  JourneyAction.FIRST_CHAPTER_MARKED,
  JourneyAction.FIRST_SYLLABUS_MARKS_RAISE,
  JourneyAction.FIRST_REVISION,
  JourneyAction.FIRST_MOCK,
]);
