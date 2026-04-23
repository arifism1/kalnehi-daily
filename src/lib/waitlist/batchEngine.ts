/**
 * Batch engine: core functions for the waitlist/batch lifecycle.
 * All functions use the service-role client (must only be called from trusted server context).
 */

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type BatchRow = {
  id: string;
  batch_number: number;
  opens_at: string;
  closes_at: string | null;
  status: string;
  size: number;
  notes: string | null;
  created_at: string;
};

export type WaitlistEntryRow = {
  id: string;
  user_id: string;
  batch_id: string | null;
  position: number;
  status: string;
  skipped_waitlist: boolean;
  razorpay_payment_id: string | null;
  notification_channel: string;
  contact_email: string | null;
  joined_at: string;
  activated_at: string | null;
  created_at: string;
};

export type AssignPositionResult =
  | { ok: true; position: number; batchNumber: number; opensAt: string; alreadyExists?: boolean }
  | { ok: false; error: string };

export type OpenBatchResult = {
  activated: number;
  batchNumber: number;
  userIds: string[];
};

/** Fetch the next scheduled (or active) batch for display. */
export async function getNextBatch(): Promise<BatchRow | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const { data } = await admin
    .from("batches")
    .select("*")
    .in("status", ["scheduled", "active"])
    .order("opens_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as BatchRow | null) ?? null;
}

/** Fetch all scheduled batches. */
export async function getScheduledBatches(): Promise<BatchRow[]> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return [];

  const { data } = await admin
    .from("batches")
    .select("*")
    .eq("status", "scheduled")
    .order("opens_at", { ascending: true });

  return (data as BatchRow[]) ?? [];
}

/** Count how many users are waiting in the queue ahead of a position. */
export async function countUsersAhead(position: number): Promise<number> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return 0;

  const { count } = await admin
    .from("waitlist_entries")
    .select("id", { count: "exact", head: true })
    .in("status", ["waiting"])
    .lt("position", position);

  return count ?? 0;
}

/** Total users on the waitlist (all statuses). */
export async function getTotalWaitlistCount(): Promise<number> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return 0;

  const { count } = await admin
    .from("waitlist_entries")
    .select("id", { count: "exact", head: true });

  return count ?? 0;
}

/**
 * Open a batch: activate all `waiting` entries for users in this batch,
 * set user_profiles.trial_started_at = now(), return list of user_ids for notifications.
 */
export async function openBatch(batchId: string): Promise<OpenBatchResult> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) throw new Error("Service role unavailable");

  // Get batch info.
  const { data: batch, error: batchErr } = await admin
    .from("batches")
    .select("id, batch_number, size, status")
    .eq("id", batchId)
    .single();

  if (batchErr || !batch) throw new Error(`Batch not found: ${batchErr?.message}`);
  if (batch.status === "active") {
    // Already opened — idempotent.
    const { data: entries } = await admin
      .from("waitlist_entries")
      .select("user_id")
      .eq("batch_id", batchId)
      .eq("status", "activated");
    return {
      activated: entries?.length ?? 0,
      batchNumber: batch.batch_number,
      userIds: (entries ?? []).map((e) => (e as { user_id: string }).user_id),
    };
  }

  // Fetch waiting entries for this batch.
  const { data: entries, error: entriesErr } = await admin
    .from("waitlist_entries")
    .select("id, user_id")
    .eq("batch_id", batchId)
    .eq("status", "waiting");

  if (entriesErr) throw new Error(`Failed to fetch entries: ${entriesErr.message}`);

  const rows = (entries ?? []) as { id: string; user_id: string }[];
  const userIds = rows.map((r) => r.user_id);
  const entryIds = rows.map((r) => r.id);

  if (userIds.length > 0) {
    // Activate entries.
    await admin
      .from("waitlist_entries")
      .update({ status: "activated", activated_at: new Date().toISOString() })
      .in("id", entryIds);

    // Set trial_started_at for users who haven't started yet.
    const now = new Date().toISOString();
    for (const uid of userIds) {
      await admin
        .from("user_profiles")
        .update({ trial_started_at: now, has_used_free_trial: true, updated_at: now })
        .eq("user_id", uid)
        .is("trial_started_at", null);
    }
  }

  // Mark batch as active.
  await admin
    .from("batches")
    .update({ status: "active" })
    .eq("id", batchId);

  return { activated: userIds.length, batchNumber: batch.batch_number, userIds };
}

/**
 * Check and mark expired trials: set waitlist_entries.status = 'expired_no_convert'
 * for users whose trial ended > 1 hour ago and who didn't subscribe.
 * Returns the list of expired user_ids (for retargeting notification scheduling).
 */
export async function checkExpiredTrials(): Promise<string[]> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return [];

  // Find activated entries where trial has expired and user has no active subscription.
  const cutoff = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1h grace

  const { data: entries } = await admin
    .from("waitlist_entries")
    .select("id, user_id")
    .eq("status", "activated");

  if (!entries || entries.length === 0) return [];

  const typed = entries as { id: string; user_id: string }[];
  const expiredIds: string[] = [];

  for (const entry of typed) {
    const { data: prof } = await admin
      .from("user_profiles")
      .select("trial_started_at, subscription_status, subscription_end_date")
      .eq("user_id", entry.user_id)
      .maybeSingle();

    if (!prof) continue;

    const trialStart = prof.trial_started_at;
    if (!trialStart) continue;

    const trialEnd = new Date(new Date(trialStart).getTime() + 3 * 24 * 60 * 60 * 1000);
    if (trialEnd.toISOString() > cutoff) continue; // Trial not yet expired

    // Check if they subscribed.
    const hasActiveSub =
      (prof.subscription_status === "active" || prof.subscription_status === "cancelled") &&
      prof.subscription_end_date &&
      new Date(prof.subscription_end_date) > new Date();

    if (!hasActiveSub) {
      expiredIds.push(entry.user_id);
      await admin
        .from("waitlist_entries")
        .update({ status: "expired_no_convert" })
        .eq("id", entry.id);
    }
  }

  return expiredIds;
}

/** Read an admin_config value. Falls back to the provided default. */
export async function getAdminConfig(key: string, defaultValue: string): Promise<string> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return defaultValue;

  const { data } = await admin
    .from("admin_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  return (data as { value: string } | null)?.value ?? defaultValue;
}

/** Write an admin_config value with audit trail. */
export async function setAdminConfig(
  key: string,
  value: string,
  updatedBy: string,
): Promise<void> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) throw new Error("Service role unavailable");

  const { data: existing } = await admin
    .from("admin_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  const previousValue = (existing as { value: string } | null)?.value ?? null;

  await admin
    .from("admin_config")
    .upsert({
      key,
      value,
      previous_value: previousValue,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    });
}

/** Get all admin_config rows. */
export async function getAllAdminConfig(): Promise<Record<string, string>> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return {};

  const { data } = await admin.from("admin_config").select("key, value");
  const rows = (data ?? []) as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Check if a user_id is in admin_users. */
export async function isAdminUser(userId: string): Promise<boolean> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return false;

  const { data } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return data !== null;
}

/** Get the waitlist entry for a user. */
export async function getUserWaitlistEntry(userId: string): Promise<WaitlistEntryRow | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const { data } = await admin
    .from("waitlist_entries")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return (data as WaitlistEntryRow | null);
}
