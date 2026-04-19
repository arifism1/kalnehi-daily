import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { USER_ERROR } from "@/lib/userFacingErrors";

export const runtime = "nodejs";

/**
 * DELETE /api/prepbrain/conversations/:id — remove a thread (messages cascade).
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (
    !id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return NextResponse.json({ ok: false, error: "Invalid conversation id." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: USER_ERROR.session }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Service temporarily unavailable." },
      { status: 503 },
    );
  }

  const { data: deleted, error } = await admin
    .from("prepbrain_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    console.error("[prepbrain/conversations] delete failed", error);
    return NextResponse.json({ ok: false, error: "Could not delete chat." }, { status: 500 });
  }

  if (!deleted?.length) {
    return NextResponse.json({ ok: false, error: "Chat not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
