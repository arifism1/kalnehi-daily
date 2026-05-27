import { asUntypedServiceRole, type TypedServiceRole } from "@/lib/supabase/serviceRoleUntyped";

export type NotificationJobType = "custom_reminder" | "scheduled_notification";

const MAX_RETRIES = 3;

export type NotificationJobRow = {
  id: string;
  type: NotificationJobType;
  payload: Record<string, unknown>;
  scheduled_for: string;
  status: string;
  retry_count: number;
};

export async function enqueueNotificationJob(
  admin: TypedServiceRole,
  input: {
    type: NotificationJobType;
    payload: Record<string, unknown>;
    retryCount?: number;
    delayMinutes?: number;
    error?: string;
  },
): Promise<void> {
  const retryCount = input.retryCount ?? 0;
  const delayMinutes = input.delayMinutes ?? Math.min(60, 2 ** retryCount);
  const scheduledFor = new Date(Date.now() + delayMinutes * 60_000).toISOString();

  await asUntypedServiceRole(admin).from("notification_jobs").insert({
    type: input.type,
    payload: input.payload,
    scheduled_for: scheduledFor,
    status: "pending",
    retry_count: retryCount,
    error: input.error ?? null,
  });
}

/** Claims due jobs (pending/failed) for processing; service-role only. */
export async function claimDueNotificationJobs(
  admin: TypedServiceRole,
  limit = 50,
): Promise<NotificationJobRow[]> {
  const nowIso = new Date().toISOString();

  const db = asUntypedServiceRole(admin);
  const { data: candidates, error: selErr } = await db
    .from("notification_jobs")
    .select("id")
    .in("status", ["pending", "failed"])
    .lte("scheduled_for", nowIso)
    .lt("retry_count", MAX_RETRIES)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (selErr || !candidates?.length) {
    return [];
  }

  const ids = candidates.map((r) => r.id as string);
  const { data: claimed, error: upErr } = await db
    .from("notification_jobs")
    .update({
      status: "processing",
      last_attempted_at: nowIso,
    })
    .in("id", ids)
    .in("status", ["pending", "failed"])
    .select("id, type, payload, scheduled_for, status, retry_count");

  if (upErr) {
    return [];
  }

  return (claimed ?? []) as NotificationJobRow[];
}

export async function markNotificationJobDone(
  admin: TypedServiceRole,
  jobId: string,
): Promise<void> {
  await asUntypedServiceRole(admin)
    .from("notification_jobs")
    .update({ status: "done", error: null })
    .eq("id", jobId);
}

export async function markNotificationJobFailed(
  admin: TypedServiceRole,
  job: NotificationJobRow,
  errorMessage: string,
): Promise<void> {
  const nextRetry = job.retry_count + 1;
  if (nextRetry >= MAX_RETRIES) {
    await asUntypedServiceRole(admin)
      .from("notification_jobs")
      .update({
        status: "failed",
        retry_count: nextRetry,
        error: errorMessage,
      })
      .eq("id", job.id);
    return;
  }

  const delayMinutes = Math.min(60, 2 ** nextRetry);
  const scheduledFor = new Date(Date.now() + delayMinutes * 60_000).toISOString();

  await asUntypedServiceRole(admin)
    .from("notification_jobs")
    .update({
      status: "pending",
      retry_count: nextRetry,
      scheduled_for: scheduledFor,
      error: errorMessage,
    })
    .eq("id", job.id);
}
