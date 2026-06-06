import { type NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { logAdminAction } from "@/lib/admin/auditLog";
import { deleteUserAccount } from "@/lib/dpdp/deleteUserAccount";
import { sendErasureCompletedEmail } from "@/lib/dpdp/rightsRequest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export const runtime = "nodejs";

type PatchBody = {
  id?: string;
  status?: string;
  notes?: string;
  fulfillErasure?: boolean;
};

const VALID_STATUSES = new Set(["in_progress", "resolved", "rejected"]);
const TERMINAL_STATUSES = new Set(["resolved", "rejected"]);

export async function PATCH(req: NextRequest) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!(await isAdminUser(user.id, user.email ?? undefined))) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  const status = (body.status ?? "").trim();
  const fulfillErasure = body.fulfillErasure === true;

  if (!id || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "Invalid id or status." }, { status: 400 });
  }

  if (fulfillErasure && status !== "resolved") {
    return NextResponse.json(
      { ok: false, error: "fulfillErasure requires status resolved." },
      { status: 400 },
    );
  }

  const { data: requestRow, error: fetchErr } = await admin
    .from("dpdp_rights_requests")
    .select("id, user_id, type, status, reference_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !requestRow) {
    return NextResponse.json({ ok: false, error: "Request not found." }, { status: 404 });
  }

  if (TERMINAL_STATUSES.has(requestRow.status)) {
    return NextResponse.json(
      { ok: false, error: "Request is already closed." },
      { status: 400 },
    );
  }

  if (fulfillErasure) {
    if (requestRow.type !== "erasure") {
      return NextResponse.json(
        { ok: false, error: "fulfillErasure is only valid for erasure requests." },
        { status: 400 },
      );
    }

    const { data: authUser } = await admin.auth.admin.getUserById(requestRow.user_id);
    const userEmail = authUser.user?.email ?? null;

    const deleteResult = await deleteUserAccount({
      userId: requestRow.user_id,
      targetEmail: userEmail,
    });

    if (!deleteResult.ok) {
      return NextResponse.json(
        { ok: false, error: deleteResult.error },
        { status: deleteResult.status ?? 500 },
      );
    }

    await logAdminAction({
      adminUserId: user.id,
      action: "dpdp_fulfill_erasure",
      targetUserId: requestRow.user_id,
      metadata: {
        requestId: requestRow.id,
        referenceId: requestRow.reference_id,
        targetEmail: userEmail,
      },
    });

    if (userEmail) {
      await sendErasureCompletedEmail({
        to: userEmail,
        referenceId: requestRow.reference_id,
      });
    }
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    updated_at: now,
  };
  if (status === "resolved" || status === "rejected") {
    patch.resolved_at = now;
  }
  if (typeof body.notes === "string" && body.notes.trim()) {
    patch.notes = body.notes.trim().slice(0, 4000);
  }

  const { error } = await admin.from("dpdp_rights_requests").update(patch).eq("id", id);
  if (error) {
    console.error("[admin/dpdp/rights-request] update failed:", error.message);
    if (fulfillErasure) {
      return NextResponse.json({
        ok: true,
        fulfilledErasure: true,
        warning: "Account deleted but request status update failed.",
      });
    }
    return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fulfilledErasure: fulfillErasure });
}
