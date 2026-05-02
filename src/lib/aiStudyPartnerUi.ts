/**
 * Set NEXT_PUBLIC_ENABLE_AI_STUDY_PARTNER=true to show the AI Study Partner
 * feature (purchase card, session sheet, camera verification, nav link).
 * Unset or any other value keeps it hidden (launch-delay gate).
 */
export const isAiStudyPartnerUiEnabled =
  process.env.NEXT_PUBLIC_ENABLE_AI_STUDY_PARTNER === "true";
