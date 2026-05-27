/**
 * GET /api/cron/renew-org-subscriptions
 * Vercel Cron: runs daily at 02:00 UTC (07:30 IST).
 *
 * Finds every active org member whose org-granted subscription is expiring within
 * 5 days (and who has no Razorpay mandate — i.e., their access is org-sponsored)
 * and extends it by 35 days. This keeps B2B access live month-to-month without
 * any student ever needing to pay.
 *
 * Why 35 days? The grant window is slightly longer than a calendar month so that
 * even if this cron misses one day (holiday, deploy gap), the student doesn't
 * lose access.
 *
 * Safety: users with a live razorpay_subscription_id are skipped entirely —
 * their billing is managed by Razorpay and must not be overwritten.
 */

import { type NextRequest, NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/verifyCronSecret";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const maxDuration = 300;

const LOG = "[cron/renew-org-subscriptions]";

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    console.warn(`${LOG} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Step 1: Get all current org member user_ids.
  const { data: memberships, error: memberErr } = await admin
    .from("user_organization_memberships")
    .select("user_id");

  if (memberErr) {
    console.error(`${LOG} failed to load memberships`, memberErr.message);
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  const userIds = (memberships ?? []).map((m) => m.user_id as string);

  if (userIds.length === 0) {
    console.log(`${LOG} no org members found, nothing to renew`);
    return NextResponse.json({ ok: true, renewed: 0 });
  }

  // Step 2: Find those whose subscription is expiring within 5 days and have
  // no Razorpay mandate (org-granted only).
  const cutoff = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expiring, error: expiryErr } = await admin
    .from("user_profiles")
    .select("user_id")
    .in("user_id", userIds)
    .is("razorpay_subscription_id", null)
    .lt("subscription_end_date", cutoff);

  if (expiryErr) {
    console.error(`${LOG} expiry query failed`, expiryErr.message);
    return NextResponse.json({ error: expiryErr.message }, { status: 500 });
  }

  const toRenew = expiring ?? [];
  if (toRenew.length === 0) {
    console.log(`${LOG} no subscriptions expiring within 5 days`);
    return NextResponse.json({ ok: true, renewed: 0 });
  }

  // Step 3: Extend each by 35 days.
  const newEnd = new Date(
    Date.now() + 35 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();

  let renewed = 0;
  const errors: string[] = [];

  // Process in parallel but log individual failures without aborting the batch.
  await Promise.all(
    toRenew.map(async (profile) => {
      const { error: updateErr } = await admin
        .from("user_profiles")
        .update({
          subscription_end_date: newEnd,
          subscription_status: "active",
          updated_at: now,
        })
        .eq("user_id", profile.user_id as string)
        .is("razorpay_subscription_id", null); // double-guard: never touch paying users

      if (updateErr) {
        errors.push(`${profile.user_id}: ${updateErr.message}`);
      } else {
        renewed++;
      }
    }),
  );

  if (errors.length > 0) {
    console.error(`${LOG} ${errors.length} renewal failures`, errors);
  }

  console.log(
    `${LOG} done — renewed=${renewed} errors=${errors.length} total_checked=${toRenew.length}`,
  );
  return NextResponse.json({ ok: true, renewed, errors: errors.length });
}
