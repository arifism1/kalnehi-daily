/**
 * GET /api/cron/journey-rollups
 * Recomputes user_journey_metrics for all users with profiles.
 */
import { type NextRequest, NextResponse } from "next/server";

import { rollupJourneyMetricsForUser } from "@/lib/journey/milestones";
import { verifyCronSecret } from "@/lib/verifyCronSecret";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const maxDuration = 300;

const LOG = "[cron/journey-rollups]";
const BATCH = 80;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    console.warn(`${LOG} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data: profiles, error } = await admin
    .from("user_profiles")
    .select("user_id")
    .not("user_id", "is", null);

  if (error) {
    console.error(`${LOG} profiles:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = ((profiles ?? []) as { user_id: string }[]).flatMap((p) =>
    p.user_id ? [p.user_id] : [],
  );

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < userIds.length; i += BATCH) {
    const chunk = userIds.slice(i, i + BATCH);
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- intentional chunked batching; processing all users at once would exhaust memory
    await Promise.all(
      chunk.map(async (userId) => {
        try {
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- inside Promise.all; all chunk items run concurrently
          await rollupJourneyMetricsForUser(userId);
          processed++;
        } catch (e) {
          failed++;
          console.warn(`${LOG} user ${userId}:`, e);
        }
      }),
    );
  }

  console.log(`${LOG} processed=${processed} failed=${failed} total=${userIds.length}`);
  return NextResponse.json({ ok: true, processed, failed, total: userIds.length });
}
