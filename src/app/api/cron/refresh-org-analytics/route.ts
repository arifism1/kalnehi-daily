/**
 * GET /api/cron/refresh-org-analytics
 * Refreshes cached analytics aggregates for all active organizations.
 * Runs every 15 minutes (see vercel.json).
 *
 * Currently: lightweight placeholder that verifies all orgs are reachable.
 * Extend with materialized rollup writes as analytics complexity grows.
 */
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 60;

const LOG = "[cron/refresh-org-analytics]";

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    console.warn(`${LOG} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id, slug");

  if (error) {
    console.error(`${LOG} orgs:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orgList = orgs ?? [];
  const processed: string[] = [];

  for (const org of orgList) {
    try {
      // Aggregate: count active students in the last 7 days for this org.
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const { count } = await admin
        .from("user_app_active_time_daily")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .gte("date_ist", sevenDaysAgo);

      console.log(`${LOG} org=${org.slug} active7d=${count ?? 0}`);
      processed.push(org.slug);
    } catch (e) {
      console.warn(`${LOG} org=${org.slug}:`, e);
    }
  }

  return NextResponse.json({ ok: true, processed, total: orgList.length });
}
