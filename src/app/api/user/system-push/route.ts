import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";

/** Read whether automated system pushes are enabled (defaults true). */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseServiceRoleClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
    }

    const { data: row } = await admin
      .from("user_profiles")
      .select("system_push_notifications")
      .eq("user_id", user.id)
      .maybeSingle();

    const enabled = row?.system_push_notifications !== false;
    return NextResponse.json({ enabled });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[user/system-push GET]", msg);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** Enable or disable automated system pushes. */
export async function PATCH(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const enabled =
      typeof body === "object" &&
      body !== null &&
      "enabled" in body &&
      typeof (body as { enabled: unknown }).enabled === "boolean"
        ? (body as { enabled: boolean }).enabled
        : null;
    if (enabled === null) {
      return NextResponse.json({ error: "enabled boolean required" }, { status: 400 });
    }

    const admin = getSupabaseServiceRoleClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
    }

    const { error } = await admin
      .from("user_profiles")
      .update({ system_push_notifications: enabled })
      .eq("user_id", user.id);

    if (error) {
      console.error("[user/system-push PATCH]", error.message);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, enabled });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[user/system-push PATCH] unhandled", msg);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
