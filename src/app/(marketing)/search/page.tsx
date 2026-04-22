import type { Metadata } from "next";
import { Suspense } from "react";

import { getSearchIndex } from "@/config/searchIndex";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

import { SearchClient } from "./SearchClient";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q;
  if (q && String(q).trim().length > 0) {
    return {
      title: { absolute: `Search: ${q} | ${SITE_NAME}` },
      description: "Search results on Kalnehi Daily.",
      robots: { index: false, follow: true },
    };
  }
  return marketingPageMetadata({
    path: "/search",
    title: `Search | ${SITE_NAME}`,
    description: "Search exam pages, features, blog posts, and tools on Kalnehi Daily — same path used by the site search box in Google sitelinks.",
  });
}

export default function SearchPage() {
  const index = getSearchIndex();
  return (
    <Suspense fallback={<p className="text-sm text-kal-text-secondary">Loading search…</p>}>
      <SearchClient index={index} />
    </Suspense>
  );
}
