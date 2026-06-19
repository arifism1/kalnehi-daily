/**
 * GET /api/admin/users-export
 * Downloads an Excel file with all non-admin users and full profile data.
 * Admin-gated: requires a valid session + isAdminUser().
 */
import { type NextRequest, NextResponse } from "next/server";

import { logAdminAction } from "@/lib/admin/auditLog";
import { exportAllUsersForAdmin } from "@/lib/admin/queries/userExportQueries";
import { buildUsersExportWorkbook, usersExportFilename } from "@/lib/admin/usersExport";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: NextRequest) {
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

  try {
    const rows = await exportAllUsersForAdmin();
    const buffer = await buildUsersExportWorkbook(rows);
    const filename = usersExportFilename();

    await logAdminAction({
      adminUserId: user.id,
      action: "export_users",
      metadata: { rowCount: rows.length, filename },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[users-export]", err);
    return NextResponse.json({ ok: false, error: "Export failed." }, { status: 500 });
  }
}
