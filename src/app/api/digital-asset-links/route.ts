/**
 * Serves /.well-known/assetlinks.json (via next.config rewrite) for Trusted
 * Web Activity (TWA) verification on Google Play.
 *
 * Required env vars (set in Vercel dashboard + .env.local):
 *   TWA_PACKAGE_NAME         – e.g. "com.kalnehi.daily"
 *   TWA_SHA256_FINGERPRINTS  – comma-separated SHA-256 cert fingerprints from Play Console
 *                              e.g. "AB:CD:EF:....,12:34:56:...."
 *
 * How to get the fingerprint:
 *   Play Console → Setup → App integrity → App signing → "App signing key certificate"
 *   Copy the SHA-256 value and paste it (colon-separated uppercase hex) here.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const packageName = process.env.TWA_PACKAGE_NAME?.trim();
  const rawFingerprints = process.env.TWA_SHA256_FINGERPRINTS?.trim();

  if (!packageName || !rawFingerprints) {
    return new NextResponse(
      JSON.stringify({ error: "TWA_PACKAGE_NAME or TWA_SHA256_FINGERPRINTS not set" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const fingerprints = rawFingerprints
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const assetLinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return new NextResponse(JSON.stringify(assetLinks, null, 2), {
    headers: {
      "Content-Type": "application/json",
      // Browsers and Googlebot cache this; 1 hour is safe.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
