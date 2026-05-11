/**
 * GET /api/admin/pwa-stats?days=30
 * Returns a PwaStatsSnapshot covering the last N days.
 * Admin-gated: requires a valid session + isAdminUser().
 */
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { getPwaStats } from "@/lib/admin/queries/activityQueries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const adminOk = await isAdminUser(user.id, user.email ?? undefined);
  if (!adminOk) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const rawDays = req.nextUrl.searchParams.get("days");
  const days = Math.min(Math.max(parseInt(rawDays ?? "30", 10) || 30, 1), 180);

  const data = await getPwaStats(days);
  if (!data) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, data });
}
