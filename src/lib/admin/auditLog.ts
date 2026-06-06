import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import type { Json } from "@/types/supabase";

export async function logAdminAction(opts: {
  adminUserId: string;
  action: string;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    console.error("[logAdminAction] service role unavailable");
    return;
  }

  const { error } = await admin.from("admin_action_audit_log").insert({
    admin_user_id: opts.adminUserId,
    action: opts.action,
    target_user_id: opts.targetUserId ?? null,
    metadata: (opts.metadata ?? {}) as Json,
  });

  if (error) {
    console.error("[logAdminAction] insert failed:", error.message);
  }
}
