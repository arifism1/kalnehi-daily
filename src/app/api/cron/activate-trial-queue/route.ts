/**
 * GET /api/cron/activate-trial-queue
 * Vercel Cron: runs at 18:30 UTC (= midnight IST).
 *
 * 1. Fetches trial_queue_entries where queued_for = today IST AND status = 'pending'
 *    (FIFO order by created_at).
 * 2. Skips entries where the user already has has_used_free_trial = true.
 * 3. Calls increment_daily_trial_count for each eligible user (atomic, respects today's cap).
 *    - ok = true  → marks activated, sets trial_started_at, sends activation email.
 *    - ok = false → today's cap is already full; re-queues entry for tomorrow.
 * 4. Returns a summary { activated, requeued, skipped }.
 */

import { type NextRequest, NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/verifyCronSecret";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { sendTrialActivationEmail } from "@/lib/waitlist/notifications";

export const runtime = "nodejs";
export const maxDuration = 300;

const LOG = "[cron/activate-trial-queue]";

type QueueEntry = { id: string; user_id: string; queued_for: string };

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    console.warn(`${LOG} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Today's date in IST (YYYY-MM-DD).
  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  // Tomorrow in IST — used if today's cap fills up mid-cron.
  const tomorrowIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));

  // Fetch all pending entries scheduled for today, oldest first (FIFO).
  const { data: entries, error: fetchErr } = await (admin as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (k: string, v: string) => {
          eq: (k: string, v: string) => {
            order: (k: string, opts: { ascending: boolean }) => Promise<{ data: QueueEntry[] | null; error: unknown }>;
          };
        };
      };
    };
  })
    .from("trial_queue_entries")
    .select("id, user_id, queued_for")
    .eq("queued_for", todayIST)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (fetchErr) {
    console.error(`${LOG} fetch error`, fetchErr);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }

  let activated = 0;
  let requeued = 0;
  let skipped = 0;

  for (const entry of entries ?? []) {
    // Skip users who already have an active trial (e.g. they started manually or paid ₹19).
    const { data: profile } = await admin
      .from("user_profiles")
      .select("has_used_free_trial")
      .eq("user_id", entry.user_id)
      .maybeSingle();

    if ((profile as { has_used_free_trial?: boolean } | null)?.has_used_free_trial) {
      await (admin as unknown as { from: (t: string) => { update: (v: object) => { eq: (k: string, v: string) => unknown } } })
        .from("trial_queue_entries")
        .update({ status: "skipped" })
        .eq("id", entry.id);
      skipped++;
      continue;
    }

    // Attempt to atomically claim a free-trial slot for today.
    const { data: rpcResult, error: rpcErr } = await admin.rpc(
      "increment_daily_trial_count" as never,
      { p_user_id: entry.user_id } as never,
    );

    if (rpcErr) {
      console.error(`${LOG} RPC error for user ${entry.user_id}:`, rpcErr.message);
      continue;
    }

    const rpc = rpcResult as { ok: boolean } | null;

    if (rpc?.ok) {
      const nowIso = new Date().toISOString();

      const { data: updatedProfile, error: profileUpdateErr } = await admin
        .from("user_profiles")
        .update({
          trial_started_at: nowIso,
          has_used_free_trial: true,
          updated_at: nowIso,
        })
        .eq("user_id", entry.user_id)
        .eq("has_used_free_trial", false)
        .select("id");

      if (profileUpdateErr) {
        console.error(`${LOG} profile update failed for ${entry.user_id}:`, profileUpdateErr.message);
        continue;
      }

      if (!updatedProfile?.length) {
        const { data: p } = await admin
          .from("user_profiles")
          .select("has_used_free_trial")
          .eq("user_id", entry.user_id)
          .maybeSingle();
        if ((p as { has_used_free_trial?: boolean } | null)?.has_used_free_trial) {
          await (admin as unknown as { from: (t: string) => { update: (v: object) => { eq: (k: string, v: string) => unknown } } })
            .from("trial_queue_entries")
            .update({ status: "skipped" })
            .eq("id", entry.id);
          skipped++;
        } else {
          console.error(
            `${LOG} profile update matched 0 rows after RPC ok for ${entry.user_id} — leaving pending for retry`,
          );
        }
        continue;
      }

      // Mark queue entry as activated.
      await (admin as unknown as { from: (t: string) => { update: (v: object) => { eq: (k: string, v: string) => unknown } } })
        .from("trial_queue_entries")
        .update({ status: "activated", activated_at: nowIso, notified_at: nowIso })
        .eq("id", entry.id);

      // Send activation email.
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(entry.user_id);
        const email = authUser?.user?.email ?? null;
        if (email) {
          await sendTrialActivationEmail({ email });
        }
      } catch (e) {
        console.warn(`${LOG} email failed for user ${entry.user_id}:`, e);
      }

      activated++;
    } else {
      // Today's cap is already full — push this user to tomorrow.
      await (admin as unknown as { from: (t: string) => { update: (v: object) => { eq: (k: string, v: string) => unknown } } })
        .from("trial_queue_entries")
        .update({ queued_for: tomorrowIST })
        .eq("id", entry.id);
      requeued++;
    }
  }

  console.log(`${LOG} done — activated=${activated} requeued=${requeued} skipped=${skipped}`);
  return NextResponse.json({ ok: true, activated, requeued, skipped });
}
