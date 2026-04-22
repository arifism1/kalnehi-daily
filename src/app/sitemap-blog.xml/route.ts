import { getBlogSitemapEntries, urlsetResponse } from "@/lib/sitemap-data";

export function GET() {
  return urlsetResponse(getBlogSitemapEntries());
}
