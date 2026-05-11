/**
 * GET /api/admin/activity-user?uid=<uuid>&limit=200
 * Returns recent activity logs for a specific user.
 * Admin-gated: requires a valid session + isAdminUser().
 */
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { getRecentActivityForUser } from "@/lib/admin/queries/activityQueries";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const uid = req.nextUrl.searchParams.get("uid") ?? "";
  if (!UUID_RE.test(uid)) {
    return NextResponse.json({ ok: false, error: "Invalid user ID." }, { status: 400 });
  }

  const rawLimit = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(rawLimit ?? "200", 10) || 200, 1), 500);

  const data = await getRecentActivityForUser(uid, limit);
  return NextResponse.json({ ok: true, data });
}
