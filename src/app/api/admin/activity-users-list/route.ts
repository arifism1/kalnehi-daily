/**
 * GET /api/admin/activity-users-list?page=1
 * Returns a paginated list of users (25 per page) for the activity admin panel.
 * Admin-gated: requires a valid session + isAdminUser().
 */
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { listUsersForAdmin } from "@/lib/admin/queries/userLookupQueries";

export const runtime = "nodejs";

const PER_PAGE = 25;

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

  const rawPage = req.nextUrl.searchParams.get("page");
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);

  const data = await listUsersForAdmin(page, PER_PAGE);
  return NextResponse.json({ ok: true, data });
}
