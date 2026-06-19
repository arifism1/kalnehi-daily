/**
 * FIZAKI public landing copy — centralized for testability (no student/exam wording).
 * Positioning: revenue/readiness, never training/courses/LMS.
 */
import { fizakiConfig } from "@/verticals/fizaki.config";

export const FIZAKI_NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#who-its-for", label: "Who it's for" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
] as const;

export const FIZAKI_HERO = {
  eyebrow: "Revenue readiness for sales teams",
  headline: "Turn enablement into revenue.",
  headlineAccent: "Prove it on the dashboard.",
  subhead:
    "FIZAKI connects your playbook, daily rep practice, post-call debrief, and live pipeline — then shows managers ramp time and quota attainment, not completion rates.",
  primaryCta: "Book a demo",
  secondaryCta: "See how it works",
} as const;

export const FIZAKI_WHO_ITS_FOR = {
  title: "Built for every seat at the table",
  subtitle:
    "Reps get daily practice. Managers get the money screen. Admins load the playbook once.",
  roles: [
    {
      id: "rep",
      title: "Rep",
      description:
        "10-minute daily practice, voice pitch drills, post-call debrief, and a Coach grounded in your playbook + pipeline.",
    },
    {
      id: "manager",
      title: "Manager",
      description:
        "Per-rep ramp progress, competency gaps, quota attainment, and consistency — prove enablement drives revenue.",
    },
    {
      id: "admin",
      title: "Admin",
      description:
        "Import your existing playbook — we structure it into modules and skills with spaced reinforcement from day one.",
    },
  ],
} as const;

export const FIZAKI_FEATURES = {
  title: "The buyer core — live on day one",
  subtitle:
    "Not another content library. A rep loop + manager attribution stack your pilot can demo immediately.",
  items: [
    {
      title: "Playbook import",
      description:
        "Paste or upload your sales playbook — auto-structured into modules, skills, and micro-skills.",
    },
    {
      title: "Daily practice",
      description:
        "10-minute voice nudges: pitch, objections, quick-tap progress — low friction, every day.",
    },
    {
      title: "Post-call debrief",
      description:
        "Rep speaks after a call — logs activity, captures what slipped, feeds the Coach.",
    },
    {
      title: `${fizakiConfig.copy.coachName}`,
      description:
        "Grounded in playbook progress + live pipeline: \"You're weak on pricing — 3 deals stuck on price. Drill this now.\"",
    },
    {
      title: fizakiConfig.copy.gapPlannerLabel,
      description:
        "Connect skill gaps to quota gap — prioritize the skills and accounts with highest payoff per effort.",
    },
    {
      title: "Manager dashboard + attribution",
      description:
        "Days-to-first-deal, days-to-full-productivity, quota attainment % — baseline vs current, queryable.",
    },
  ],
} as const;

export const FIZAKI_ROI = {
  title: "Measured metrics — not vanity completion",
  subtitle:
    "Anchor your pilot on ramp and attainment. Readiness projections are transparent heuristics, not forecasts.",
  metrics: [
    { label: "Days to first deal", value: "Tracked from ramp start" },
    { label: "Quota attainment", value: "Won vs quota, live" },
    { label: "Open pipeline", value: "Manual + CSV import today" },
    { label: "Baseline vs current", value: "Captured at onboarding" },
  ],
} as const;

export const FIZAKI_HOW_IT_WORKS = {
  title: "How it works",
  steps: [
    {
      step: "1",
      title: "Import your playbook",
      description: "Admin uploads your existing material — structured into a knowledge tree.",
    },
    {
      step: "2",
      title: "Reps practice daily",
      description: "Voice-first drills + post-call debrief — spaced reinforcement, not cramming.",
    },
    {
      step: "3",
      title: "Managers prove ROI",
      description: "Ramp time, attainment, and gap plans on one dashboard.",
    },
  ],
} as const;

export const FIZAKI_FAQ_ITEMS = [
  {
    question: "Is FIZAKI an LMS or training platform?",
    answer:
      "No. FIZAKI is a revenue-readiness execution layer — daily practice, pipeline context, and manager attribution. We measure ramp and quota, not course completion.",
  },
  {
    question: "Do reps have to manually log every deal?",
    answer:
      "Reps can enter deals by hand or voice today. CSV import from your CRM export is supported for pilots; Salesforce/HubSpot sync comes behind a clean integration interface.",
  },
  {
    question: "What does the manager dashboard show?",
    answer:
      "Per-rep ramp progress, skill gaps, quota attainment, consistency, and measured ramp metrics (days-to-first-deal, days-to-full-productivity) with a baseline captured at start.",
  },
  {
    question: "How is FIZAKI different from Kalnehi?",
    answer:
      "Same execution engine, different vertical. FIZAKI is built for sales reps and managers on playbook + pipeline + quota. Kalnehi is a separate brand for a different audience. Data and sessions are isolated per product.",
  },
] as const;

export const FIZAKI_DEMO_FORM = {
  title: "Book a demo",
  subtitle:
    "See the rep loop and manager dashboard on your playbook. We'll reach out within one business day.",
  fields: {
    name: "Full name",
    email: "Work email",
    company: "Company",
    teamSize: "Team size (optional)",
    message: "Anything we should know? (optional)",
  },
  submit: "Request demo",
  success: "Thanks — we'll be in touch shortly.",
  error: "Could not send your request. Please try again.",
} as const;

/** All user-visible strings for leakage tests. */
export function allFizakiLandingCopyStrings(): string[] {
  const chunks: string[] = [
    FIZAKI_HERO.eyebrow,
    FIZAKI_HERO.headline,
    FIZAKI_HERO.headlineAccent,
    FIZAKI_HERO.subhead,
    FIZAKI_WHO_ITS_FOR.title,
    FIZAKI_WHO_ITS_FOR.subtitle,
    FIZAKI_FEATURES.title,
    FIZAKI_FEATURES.subtitle,
    FIZAKI_ROI.title,
    FIZAKI_ROI.subtitle,
    FIZAKI_HOW_IT_WORKS.title,
    FIZAKI_DEMO_FORM.title,
    FIZAKI_DEMO_FORM.subtitle,
    ...FIZAKI_NAV_LINKS.map((l) => l.label),
    ...FIZAKI_WHO_ITS_FOR.roles.flatMap((r) => [r.title, r.description]),
    ...FIZAKI_FEATURES.items.flatMap((f) => [f.title, f.description]),
    ...FIZAKI_ROI.metrics.flatMap((m) => [m.label, m.value]),
    ...FIZAKI_HOW_IT_WORKS.steps.flatMap((s) => [s.title, s.description]),
    ...FIZAKI_FAQ_ITEMS.flatMap((f) => [f.question, f.answer]),
  ];
  return chunks.map((s) => s.toLowerCase());
}
