/**
 * Landing vertical resolution — host in local dev, build env in production.
 *
 * Production: each Vercel project bakes NEXT_PUBLIC_VERTICAL; CDN static cache preserved.
 * Development: reads Host so kalnehi.local and fizaki.local both work on one `npm run dev`.
 */
import "server-only";

import { headers } from "next/headers";

import type { VerticalId } from "@/verticals";

import { getBuildVertical, resolveVertical } from "./resolveVertical";

export async function getLandingVertical(): Promise<VerticalId> {
  if (process.env.NODE_ENV === "development") {
    const h = await headers();
    return resolveVertical(h.get("host"));
  }
  return getBuildVertical();
}
