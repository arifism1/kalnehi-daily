"use server";

import { getOrgContext } from "@/lib/auth/withOrganization";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type PushAssignmentInput = {
  organizationId: string;
  batchId?: string | null;
  taskType: string;
  /** Arbitrary structured data describing the assignment (e.g. syllabus topics, chapter list). */
  dataJson: Record<string, unknown>;
  /** ISO datetime when this assignment should be visible to students. Null = immediately. */
  scheduledFor?: string | null;
};

export type PushAssignmentResult =
  | { ok: true; assignmentId: string }
  | { ok: false; error: string };

/**
 * Writes an assignment to `institute_assignments` and creates corresponding
 * task rows in `tasks` for every student in the target batch (or whole org
 * when batchId is null).
 *
 * All task rows carry `organization_id` so they appear under the org's RLS
 * scope and do not mix with a student's personal B2C tasks in analytics.
 *
 * Restricted to org admin and faculty roles.
 */
export async function pushBatchAssignmentAction(
  input: PushAssignmentInput,
): Promise<PushAssignmentResult> {
  const ctx = await getOrgContext();
  if (!ctx || ctx.orgId !== input.organizationId) {
    return { ok: false, error: "Not authorized for this organization." };
  }
  if (ctx.role !== "admin" && ctx.role !== "faculty") {
    return { ok: false, error: "Insufficient role." };
  }

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return { ok: false, error: "Service unavailable." };

  // 1. Write the canonical assignment record.
  const { data: assignment, error: assignErr } = await serviceClient
    .from("institute_assignments")
    .insert({
      organization_id: input.organizationId,
      batch_id: input.batchId ?? null,
      task_type: input.taskType,
      data_json: input.dataJson,
      scheduled_for: input.scheduledFor ?? null,
    })
    .select("id")
    .single();

  if (assignErr || !assignment) {
    return { ok: false, error: assignErr?.message ?? "Failed to create assignment." };
  }

  // 2. Fetch all student user_ids in the target batch (or whole org).
  let memberQuery = serviceClient
    .from("user_organization_memberships")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .eq("role", "student");

  if (input.batchId) {
    memberQuery = memberQuery.eq("batch_id", input.batchId);
  }

  const { data: members } = await memberQuery;
  const studentIds = (members ?? []).map((m) => m.user_id);

  // 3. Insert one task row per student so it shows up in their task list.
  //    assigned_date is required (NOT NULL). Use the scheduled date if provided,
  //    otherwise default to today in IST (UTC+5:30).
  if (studentIds.length > 0) {
    const assignedDate = input.scheduledFor
      ? input.scheduledFor.slice(0, 10)
      : new Date(Date.now() + 5.5 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

    const taskRows = studentIds.map((userId) => ({
      user_id: userId,
      organization_id: input.organizationId,
      name: String(input.dataJson.title ?? input.taskType),
      assigned_date: assignedDate,
      status: "pending" as const,
      source: "institute_assignment",
    }));

    await serviceClient.from("tasks").insert(taskRows);
    // Non-fatal: if task insert partially fails, the assignment row still exists
    // and can be re-processed by a future cron.
  }

  return { ok: true, assignmentId: assignment.id };
}
