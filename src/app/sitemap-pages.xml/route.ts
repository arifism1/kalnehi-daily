import { getPagesSitemapEntries, urlsetResponse } from "@/lib/sitemap-data";

export function GET() {
  return urlsetResponse(getPagesSitemapEntries());
}
