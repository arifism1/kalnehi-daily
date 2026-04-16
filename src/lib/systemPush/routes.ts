import type { SystemPushKind } from "@/lib/systemPush/copy";

const SYSTEM_PUSH_PATH_BY_KIND: Record<SystemPushKind, string> = {
  morning_kickstart: "/plan",
  evening_winddown: "/reflection",
  danger_zone: "/focus",
};

export function resolveSystemPushPath(kind: string | null | undefined): string {
  if (!kind) return "/";
  return SYSTEM_PUSH_PATH_BY_KIND[kind as SystemPushKind] ?? "/";
}
