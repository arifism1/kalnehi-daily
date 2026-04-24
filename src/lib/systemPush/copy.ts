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
    body: "Competitors are already on the first block — open War Room and own hour one. 🔥",
    data: { kind, path: resolveSystemPushPath(kind) },
  };
}

export function eveningWindDownPayload() {
  const kind = SYSTEM_PUSH_KIND.evening;
  return {
    title: "Day’s done. Debrief time.",
    body: "Wind down, log honestly — tomorrow you come back sharper.",
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
