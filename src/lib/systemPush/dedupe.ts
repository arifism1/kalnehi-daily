import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

import type { SystemPushKind } from "./copy";

export async function reserveSystemPushDedupe(
  admin: SupabaseClient<Database>,
  userId: string,
  kind: SystemPushKind | string,
  dateKey: string,
): Promise<"reserved" | "duplicate" | "error"> {
  const { error } = await admin.from("user_system_push_dedupe").insert({
    user_id: userId,
    kind,
    date_key: dateKey,
  });
  if (!error) return "reserved";
  if (error.code === "23505") return "duplicate";
  console.error("[system-push] dedupe insert failed:", error.message);
  return "error";
}

export async function releaseSystemPushDedupe(
  admin: SupabaseClient<Database>,
  userId: string,
  kind: SystemPushKind | string,
  dateKey: string,
): Promise<void> {
  await admin
    .from("user_system_push_dedupe")
    .delete()
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("date_key", dateKey);
}
