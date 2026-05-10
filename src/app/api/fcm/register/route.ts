import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { assertSameOrigin } from "@/lib/assertSameOrigin";

export const runtime = "nodejs";

const MAX_TOKEN_LEN = 4096;
const MIN_TOKEN_LEN = 80;

export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
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
  const token =
    typeof body === "object" &&
    body !== null &&
    "token" in body &&
    typeof (body as { token: unknown }).token === "string"
      ? (body as { token: string }).token.trim()
      : "";
  const userAgent =
    typeof body === "object" &&
    body !== null &&
    "userAgent" in body &&
    typeof (body as { userAgent: unknown }).userAgent === "string"
      ? (body as { userAgent: string }).userAgent.trim().slice(0, 512)
      : null;

  if (token.length < MIN_TOKEN_LEN || token.length > MAX_TOKEN_LEN) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server misconfigured (service role)" },
      { status: 500 },
    );
  }

  const { data: existingRow, error: existingErr } = await admin
    .from("user_push_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (existingErr) {
    console.error("[fcm/register] token lookup", existingErr);
    return NextResponse.json({ error: "Could not verify token" }, { status: 500 });
  }
  if (existingRow && existingRow.user_id !== user.id) {
    return NextResponse.json(
      { error: "This device is already registered to another account." },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("user_push_tokens").upsert(
    {
      user_id: user.id,
      token,
      user_agent: userAgent,
      last_seen_at: now,
      invalid_registration_streak: 0,
    },
    { onConflict: "token" },
  );

  if (error) {
    console.error("[fcm/register]", error);
    return NextResponse.json({ error: "Could not save token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (token.length < MIN_TOKEN_LEN) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_push_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("token", token);

  if (error) {
    console.error("[fcm/register DELETE]", error);
    return NextResponse.json({ error: "Could not remove token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
