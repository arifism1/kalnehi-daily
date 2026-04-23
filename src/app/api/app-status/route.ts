/**
 * GET /api/app-status
 * Public — no auth required.
 * Used by the MaintenanceScreen refresh button to check if the app is back.
 * Cached 30s server-side; also instructs CDN to cache for 30s.
 */
import { NextResponse } from "next/server";

import { fetchAppConfig } from "@/lib/admin/killSwitch";

export const runtime = "nodejs";

export async function GET() {
  const config = await fetchAppConfig();

  const body = {
    app_enabled: config?.app_enabled ?? true,
    message: config?.maintenance_message ?? "Kalnehi Daily is temporarily unavailable.",
    eta: config?.maintenance_eta ?? null,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=10",
    },
  });
}
