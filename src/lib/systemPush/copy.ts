import { resolveSystemPushPath } from "@/lib/systemPush/routes";

export const SYSTEM_PUSH_KIND = {
  morning: "morning_kickstart",
  evening: "evening_winddown",
  danger: "danger_zone",
} as const;

export type SystemPushKind =
  (typeof SYSTEM_PUSH_KIND)[keyof typeof SYSTEM_PUSH_KIND];

export function morningKickstartPayload(firstName: string) {
  const safe = firstName.trim() || "there";
  const kind = SYSTEM_PUSH_KIND.morning;
  return {
    title: `Good morning, ${safe}!`,
    body: "Time to Master Today 🔥 What's your first task?",
    data: { kind, path: resolveSystemPushPath(kind) },
  };
}

export function eveningWindDownPayload() {
  const kind = SYSTEM_PUSH_KIND.evening;
  return {
    title: "Great effort today!",
    body: "Log your day and plan tomorrow's wins.",
    data: { kind, path: resolveSystemPushPath(kind) },
  };
}

export function dangerZonePayload() {
  const kind = SYSTEM_PUSH_KIND.danger;
  return {
    title: "Execution Signal • Danger",
    body: "You're in danger zone. Reclaim your focus now.",
    data: { kind, path: resolveSystemPushPath(kind) },
  };
}

export function firstNameFromFullName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "";
  const part = fullName.trim().split(/\s+/)[0];
  return part ?? "";
}
