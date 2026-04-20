export const REVISION_SESSION_KINDS = [
  "daily_suggestion_shown",
  "suggestion_accepted",
  "suggestion_dismissed",
  "active_recall_typed",
  "active_recall_voice",
  "confidence_only",
  "next_review_scheduled",
] as const;

export type RevisionSessionKind = (typeof REVISION_SESSION_KINDS)[number];

export function isRevisionSessionKind(s: string): s is RevisionSessionKind {
  return (REVISION_SESSION_KINDS as readonly string[]).includes(s);
}
