/**
 * GET /api/feature-flags
 * Requires an authenticated session.
 * Returns a map of feature key → { enabled, message } for client-side use.
 *
 * Data source: Vercel Edge Config (sub-millisecond reads, instant propagation
 * after admin toggle). Falls back to Supabase with 15 s cache in local dev.
 */
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readFeatureFlags } from "@/lib/edgeConfig";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const flags = await readFeatureFlags();

  return NextResponse.json(
    { flags },
    {
      headers: {
        // Short private cache — the hook has its own 5 s client-side cache.
        // Keeps Edge Config reads low while allowing near-instant propagation.
        "Cache-Control": "private, max-age=5, stale-while-revalidate=5",
      },
    },
  );
}
