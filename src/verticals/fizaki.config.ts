/**
 * FIZAKI (sales reps + managers) vertical config.
 *
 * Positioning wording is REVENUE/READINESS — never "training/courses/learning/LMS"
 * and never any student/exam term. Tier-2 surfaces are disabled until a pilot is signed
 * (see REFRACTOR_PLAN.md section 8).
 */
import type { VerticalConfig } from "./types";

export const fizakiConfig: VerticalConfig = {
  id: "fizaki",
  brand: {
    productName: "FIZAKI",
    shortName: "FIZAKI",
    tagline: "Turn enablement into revenue",
    domain: "www.fizaki.in",
    supportEmail: "hello@fizaki.in",
    theme: {
      // Distinct sales-tool palette; deep indigo + clean light surface.
      primaryColor: "#3B4DDB",
      backgroundColor: "#F7F8FB",
      accentColor: "#0EA5A4",
      statusBarStyle: "Light",
    },
  },
  copy: {
    audienceNoun: "rep",
    audienceNounPlural: "reps",
    knowledgeTreeLabel: "Playbook",
    knowledgeBranchLabel: "Module",
    knowledgeLeafLabel: "Skill",
    knowledgeLeafLabelPlural: "Skills",
    outcomeMetricLabel: "Quota",
    outcomeUnit: "quota",
    projectedOutcomeLabel: "Projected quota readiness",
    gapPlannerLabel: "Quota-Gap Planner",
    dailyPlanLabel: "Daily Practice",
    revisionLabel: "Reinforcement",
    assessmentLabel: "Role-play",
    mistakeLogLabel: "Lost-deal Log",
    queryTrackerLabel: "Deal Questions",
    coachName: "FIZAKI Coach",
    debriefLabel: "Post-call Debrief",
  },
  // Tier-1 buyer core only. Tier-2 (assessment/leaderboard/habits) stays off for now.
  features: {
    "playbook-import": true,
    "daily-practice": true,
    "post-call-debrief": true,
    "prepbrain-ai": true, // FIZAKI Coach reuses the Coach primitive
    "quota-gap-planner": true,
    pipeline: true,
    "manager-dashboard": true,
    "ramp-attribution": true,
    "revision-tracker": true, // spaced reinforcement of playbook/skills
    timer: true, // focus timer for daily practice
  },
  roles: ["rep", "manager", "admin"],
  defaultHomePath: "/today",
};
