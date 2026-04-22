import { getExamSitemapEntries, urlsetResponse } from "@/lib/sitemap-data";

export function GET() {
  return urlsetResponse(getExamSitemapEntries());
}
