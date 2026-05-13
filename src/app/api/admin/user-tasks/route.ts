/**
 * GET /api/admin/user-tasks?uid=<uuid>&days=<30>
 * Returns daily task history for a specific user from the last N days.
 * Admin-gated: requires a valid session + isAdminUser().
 */
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { getUserDailyTaskHistory } from "@/lib/admin/queries/taskHistoryQueries";

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

  const rawDays = req.nextUrl.searchParams.get("days");
  const days = Math.min(Math.max(parseInt(rawDays ?? "30", 10) || 30, 1), 90);

  const data = await getUserDailyTaskHistory(uid, days);
  return NextResponse.json({ ok: true, data });
}
