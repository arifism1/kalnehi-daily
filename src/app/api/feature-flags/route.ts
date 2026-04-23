/**
 * GET /api/feature-flags
 * Requires an authenticated session.
 * Returns a map of feature key → { enabled, message } for client-side use.
 * Cached 60s server-side.
 */
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchFeatureFlags } from "@/lib/admin/killSwitch";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const flags = await fetchFeatureFlags();

  const flagMap: Record<string, { enabled: boolean; message: string | null }> = {};
  for (const flag of flags) {
    flagMap[flag.feature_key] = {
      enabled: flag.enabled,
      message: flag.disabled_message ?? null,
    };
  }

  return NextResponse.json(
    { flags: flagMap },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    },
  );
}
