import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/site";

/**
 * Legacy `/api/og?…` links (old WhatsApp / Twitter shares) redirect to the default static OG image.
 *
 * Custom previews now live on segment routes (e.g. `/blog/[slug]/opengraph-image`, `/jee/opengraph-image`).
 * Deep links that depended on query params no longer get title-specific art — they show the site-default OG.
 */
export async function GET() {
  return NextResponse.redirect(absoluteUrl("/opengraph-image"), 307);
}
