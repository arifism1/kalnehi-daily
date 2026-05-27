/**
 * GET /api/cron/notify-batch-faculty
 * Sends a daily digest push notification to faculty members of active orgs.
 * Runs once daily at 09:00 IST (03:30 UTC — see vercel.json).
 *
 * Currently: lightweight placeholder that fetches faculty memberships.
 * Extend with FCM sends (using existing src/lib/fcm/send.ts) as needed.
 */
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 120;

const LOG = "[cron/notify-batch-faculty]";

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    console.warn(`${LOG} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Fetch all faculty / org-admin memberships.
  const { data: members, error } = await admin
    .from("user_organization_memberships")
    .select("user_id, organization_id, role, organizations(name)")
    .in("role", ["faculty", "admin"]);

  if (error) {
    console.error(`${LOG} members:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const facultyList = members ?? [];
  console.log(`${LOG} faculty_count=${facultyList.length}`);

  // TODO: Extend with FCM push sends using src/lib/fcm/send.ts once the
  // notification template for daily faculty digest is designed.
  // Pattern: fetch push tokens from user_push_tokens where user_id IN facultyUserIds,
  // then call sendFcmNotification() for each token.

  return NextResponse.json({
    ok: true,
    faculty_notified: 0,
    faculty_total: facultyList.length,
    note: "FCM sends pending implementation",
  });
}
