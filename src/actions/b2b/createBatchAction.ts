"use server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export type CreateBatchInput = {
  orgId: string;
  name: string;
  exam_type: string;
};

export type CreateBatchResult =
  | { ok: true; batchId: string; name: string; exam_type: string; created_at: string }
  | { ok: false; error: string };

/** Creates a new batch under an organization. Platform-admin only. */
export async function createBatchAction(
  input: CreateBatchInput,
): Promise<CreateBatchResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) return { ok: false, error: "Forbidden." };

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return { ok: false, error: "Service unavailable." };

  const { data, error } = await serviceClient
    .from("org_batches")
    .insert({
      organization_id: input.orgId,
      name: input.name.trim(),
      exam_type: input.exam_type,
    })
    .select("id, name, exam_type, created_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };

  return {
    ok: true,
    batchId: data.id,
    name: data.name,
    exam_type: data.exam_type,
    created_at: data.created_at,
  };
}
