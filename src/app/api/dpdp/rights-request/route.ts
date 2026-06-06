import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createRightsRequest } from "@/lib/dpdp/rightsRequest";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  type?: string;
};

export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const typeRaw = (body.type ?? "").trim();
  if (typeRaw !== "erasure") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Only account deletion (erasure) requests can be submitted here. For other rights, email our Grievance Officer.",
      },
      { status: 400 },
    );
  }

  const result = await createRightsRequest({
    userId: user.id,
    userEmail: user.email,
    type: "erasure",
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    referenceId: result.referenceId,
    dueAt: result.dueAt,
  });
}
