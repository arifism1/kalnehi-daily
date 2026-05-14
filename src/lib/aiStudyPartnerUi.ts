/**
 * Set NEXT_PUBLIC_ENABLE_AI_STUDY_PARTNER=true to enable AI Study Partner
 * purchase and pooled-time flows (e.g. My Plan, AddStudySessionSheet balance).
 * On-camera sessions nav and /study-sessions are hidden separately via
 * LAUNCH_HIDDEN_DASHBOARD_FEATURE_IDS in dashboardFeatures.ts.
 * Unset or any other value keeps partner UI off.
 */
export const isAiStudyPartnerUiEnabled =
  process.env.NEXT_PUBLIC_ENABLE_AI_STUDY_PARTNER === "true";
