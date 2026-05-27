"use server";

import { getOrgContext } from "@/lib/auth/withOrganization";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export interface OrgAnalytics {
  totalStudents: number;
  activeStudents7d: number;
  avgDailyTasks: number;
  totalBatches: number;
  recentAssignments: Array<{
    id: string;
    task_type: string;
    created_at: string;
    scheduled_for: string | null;
    batch_name: string | null;
  }>;
}

export interface OrgBatchRow {
  id: string;
  name: string;
  exam_type: string;
  created_at: string;
}

export interface OrgAssignmentRow {
  id: string;
  task_type: string;
  created_at: string;
  scheduled_for: string | null;
  batch_name: string | null;
}

/**
 * Aggregates KPIs for the institute dashboard. Uses service role to query
 * across all org members — reads only, no mutations.
 */
export async function getOrgAnalytics(orgId: string): Promise<OrgAnalytics> {
  const ctx = await getOrgContext();
  if (!ctx || ctx.orgId !== orgId) {
    return { totalStudents: 0, activeStudents7d: 0, avgDailyTasks: 0, totalBatches: 0, recentAssignments: [] };
  }

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) {
    return { totalStudents: 0, activeStudents7d: 0, avgDailyTasks: 0, totalBatches: 0, recentAssignments: [] };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalStudents },
    { data: activeRows },       // distinct user_ids active in last 7d
    { data: batchRows },
    { data: assignmentRows },
    { count: taskCountRaw },    // accurate row count via head:true
  ] = await Promise.all([
    serviceClient
      .from("user_organization_memberships")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("role", "student"),

    // Fetch actual user_id values so we can deduplicate — a student active
    // on multiple days counts as one, not seven.
    serviceClient
      .from("user_app_active_time_daily")
      .select("user_id")
      .eq("organization_id", orgId)
      .gte("date_ist", sevenDaysAgo.slice(0, 10)),

    serviceClient
      .from("org_batches")
      .select("id, name, exam_type, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),

    serviceClient
      .from("institute_assignments")
      .select("id, task_type, created_at, scheduled_for, batch_id, org_batches(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),

    // head:true returns the exact count in the `count` field without fetching
    // rows — avoids the 1000-row PostgREST page-size cap.
    serviceClient
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", sevenDaysAgo),
  ]);

  const studentCount = totalStudents ?? 0;
  const activeStudents7d = new Set((activeRows ?? []).map((r) => r.user_id))
    .size;
  const taskCount = taskCountRaw ?? 0;
  const avgDailyTasks =
    studentCount > 0 ? Math.round((taskCount / 7 / studentCount) * 10) / 10 : 0;

  const recentAssignments: OrgAnalytics["recentAssignments"] = (
    assignmentRows ?? []
  ).map((a) => {
    const batch = a.org_batches as { name: string } | null;
    return {
      id: a.id,
      task_type: a.task_type,
      created_at: a.created_at,
      scheduled_for: a.scheduled_for ?? null,
      batch_name: batch?.name ?? null,
    };
  });

  return {
    totalStudents: studentCount,
    activeStudents7d,
    avgDailyTasks,
    totalBatches: batchRows?.length ?? 0,
    recentAssignments,
  };
}

/** Returns all batches for an org. */
export async function getOrgBatches(orgId: string): Promise<OrgBatchRow[]> {
  const ctx = await getOrgContext();
  if (!ctx || ctx.orgId !== orgId) return [];

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return [];

  const { data } = await serviceClient
    .from("org_batches")
    .select("id, name, exam_type, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return (data ?? []) as OrgBatchRow[];
}

/** Returns recent assignments for an org with batch name. */
export async function getOrgAssignments(
  orgId: string,
): Promise<OrgAssignmentRow[]> {
  const ctx = await getOrgContext();
  if (!ctx || ctx.orgId !== orgId) return [];

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return [];

  const { data } = await serviceClient
    .from("institute_assignments")
    .select("id, task_type, created_at, scheduled_for, batch_id, org_batches(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return ((data ?? []) as Array<{
    id: string;
    task_type: string;
    created_at: string;
    scheduled_for: string | null;
    batch_id: string | null;
    org_batches: { name: string } | null;
  }>).map((a) => ({
    id: a.id,
    task_type: a.task_type,
    created_at: a.created_at,
    scheduled_for: a.scheduled_for,
    batch_name: a.org_batches?.name ?? null,
  }));
}
