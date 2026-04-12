export const CONTACT_SUPPORT_SUBJECTS = [
  { value: "bug_report", label: "Bug report" },
  { value: "feature_request", label: "Feature request" },
  { value: "billing_issue", label: "Billing issue" },
  { value: "general_support", label: "General support" },
  { value: "other", label: "Other" },
] as const;

export type ContactSupportSubjectValue =
  (typeof CONTACT_SUPPORT_SUBJECTS)[number]["value"];

export function isContactSupportSubject(
  v: string,
): v is ContactSupportSubjectValue {
  return CONTACT_SUPPORT_SUBJECTS.some((s) => s.value === v);
}

export function contactSupportSubjectLabel(
  value: ContactSupportSubjectValue,
): string {
  const row = CONTACT_SUPPORT_SUBJECTS.find((s) => s.value === value);
  return row?.label ?? value;
}
