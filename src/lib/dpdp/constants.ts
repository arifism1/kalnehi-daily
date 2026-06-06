import { SUPPORT_EMAIL } from "@/lib/seo-metadata";

/** Bump when signup notice purposes or processors change materially. */
export const DPDP_PURPOSE_VERSION = "2026-06-01";

export const DPDP_RIGHTS_SLA_DAYS = 90;
export const DPDP_GRIEVANCE_ACK_HOURS = 48;
export const DPDP_GRIEVANCE_RESOLVE_DAYS = 30;

export const GRIEVANCE_OFFICER_NAME = "Privacy & Grievance Officer, Neven Academy Assam";
export const GRIEVANCE_OFFICER_EMAIL = SUPPORT_EMAIL;

export const DPDP_SIGNUP_PURPOSES = [
  "Create and secure your account (email or Google sign-in).",
  "Provide core exam prep features: planner, syllabus tracker, habits, and study logs.",
  "Sync your study data across devices and send product notifications you enable.",
  "Process optional AI and voice features when you use them (via third-party model providers).",
  "Manage subscriptions and billing through our payment processor.",
] as const;

export const DPDP_SIGNUP_PROCESSORS = [
  "Supabase (database & authentication)",
  "Vercel (hosting)",
  "Razorpay (payments, if you subscribe)",
  "Groq and other AI providers (when you use AI/voice features)",
  "Firebase (push notifications, if enabled)",
  "Resend (transactional email)",
] as const;

export type DpdpRightsRequestType = "access" | "correction" | "erasure" | "nomination";

export const DPDP_RIGHTS_REQUEST_TYPES: DpdpRightsRequestType[] = [
  "access",
  "correction",
  "erasure",
  "nomination",
];
