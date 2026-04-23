/**
 * GET /api/cron/open-batches
 * Vercel Cron: runs every 15 minutes.
 * 1. Finds batches whose opens_at has passed and status = 'scheduled'
 * 2. Activates users (sets trial_started_at)
 * 3. Sends BATCH_OPEN notifications
 * 4. Schedules closes_at = opens_at + 3 days (trial window)
 */
import { type NextRequest, NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/verifyCronSecret";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { openBatch } from "@/lib/waitlist/batchEngine";
import { sendBatchOpen, sendBatch1Hr } from "@/lib/waitlist/notifications";

export const runtime = "nodejs";
export const maxDuration = 300;

const LOG = "[cron/open-batches]";

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    console.warn(`${LOG} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const now = new Date().toISOString();
  const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // Find batches that should open now.
  const { data: dueNow, error: dueErr } = await admin
    .from("batches")
    .select("id, batch_number, opens_at")
    .eq("status", "scheduled")
    .lte("opens_at", now);

  if (dueErr) {
    console.error(`${LOG} query error`, dueErr.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  // Find batches opening in ~1 hour (for 1hr push notification).
  const { data: due1hr } = await admin
    .from("batches")
    .select("id, batch_number")
    .eq("status", "scheduled")
    .lte("opens_at", oneHourLater)
    .gt("opens_at", now);

  let totalActivated = 0;
  const openedBatches: number[] = [];

  // Open due batches.
  for (const batch of dueNow ?? []) {
    const b = batch as { id: string; batch_number: number; opens_at: string };
    try {
      const result = await openBatch(b.id);
      totalActivated += result.activated;
      openedBatches.push(b.batch_number);

      // Set closes_at = opens_at + 3 days.
      const closesAt = new Date(new Date(b.opens_at).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      await admin.from("batches").update({ closes_at: closesAt }).eq("id", b.id);

      // Send BATCH_OPEN notifications to all activated users.
      for (const userId of result.userIds) {
        const { data: entry } = await admin
          .from("waitlist_entries")
          .select("notification_channel, contact_email")
          .eq("user_id", userId)
          .maybeSingle();

        const { data: authUser } = await admin.auth.admin.getUserById(userId);
        const email = (entry as { contact_email?: string | null } | null)?.contact_email
          ?? authUser?.user?.email
          ?? null;
        const channel = ((entry as { notification_channel?: string } | null)?.notification_channel ?? "email") as "email" | "push" | "both";

        await sendBatchOpen({ email, userId, channel, batchNumber: b.batch_number });
      }

      console.info(`${LOG} opened batch=${b.batch_number} activated=${result.activated}`);
    } catch (e) {
      console.error(`${LOG} failed to open batch=${b.batch_number}`, e instanceof Error ? e.message : e);
    }
  }

  // Send 1-hour warning pushes.
  for (const batch of due1hr ?? []) {
    const b = batch as { id: string; batch_number: number };
    const { data: entries } = await admin
      .from("waitlist_entries")
      .select("user_id")
      .eq("batch_id", b.id)
      .eq("status", "waiting");

    for (const entry of entries ?? []) {
      await sendBatch1Hr({ userId: (entry as { user_id: string }).user_id, batchNumber: b.batch_number });
    }
  }

  return NextResponse.json({
    ok: true,
    openedBatches,
    totalActivated,
    oneHourWarningsSent: (due1hr ?? []).length,
  });
}
