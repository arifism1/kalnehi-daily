import { type NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { sendBreachNotificationEmail } from "@/lib/dpdp/rightsRequest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  description?: string;
  userIds?: string[];
  boardNotified?: boolean;
  notifyPrincipals?: boolean;
};

export async function POST(req: NextRequest) {
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

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const description = (body.description ?? "").trim();
  if (description.length < 20) {
    return NextResponse.json(
      { ok: false, error: "Description must be at least 20 characters." },
      { status: 400 },
    );
  }

  const userIds = (body.userIds ?? []).filter((id) => UUID_RE.test(id));
  const boardNotified = body.boardNotified === true;
  const notifyPrincipals = body.notifyPrincipals === true;
  const now = new Date().toISOString();

  const status = notifyPrincipals
    ? "principals_notified"
    : boardNotified
      ? "board_notified"
      : "draft";

  const { data: incident, error: insErr } = await admin
    .from("dpdp_breach_incidents")
    .insert({
      description,
      affected_count: userIds.length,
      affected_user_ids: userIds,
      created_by: user.id,
      board_notified_at: boardNotified ? now : null,
      principal_notified_at: notifyPrincipals ? now : null,
      status,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insErr || !incident) {
    console.error("[admin/dpdp/breach-notify] insert failed:", insErr?.message);
    return NextResponse.json({ ok: false, error: "Could not log incident." }, { status: 500 });
  }

  let emailsSent = 0;
  if (notifyPrincipals && userIds.length > 0) {
    for (const uid of userIds) {
      const { data: authUser } = await admin.auth.admin.getUserById(uid);
      const email = authUser.user?.email;
      if (!email) continue;
      const sent = await sendBreachNotificationEmail({
        to: email,
        description,
        incidentId: incident.id,
      });
      if (sent) emailsSent += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    incidentId: incident.id,
    emailsSent,
  });
}
