import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/site";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/seo-metadata";

function resolveOgImage(ogImage?: string): { url: string; width: number; height: number; alt: string } {
  const url =
    !ogImage
      ? absoluteUrl(OG_IMAGE_PATH)
      : ogImage.startsWith("http://") || ogImage.startsWith("https://")
        ? ogImage
        : absoluteUrl(ogImage.startsWith("/") ? ogImage : `/${ogImage}`);

  return {
    url,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
  };
}

export type MarketingPageMetadataInput = {
  path: string;
  title: string;
  description: string;
  /** When set, `<link rel="canonical">` points here (e.g. mirror pages under `/guides` SEO). */
  canonicalPath?: string;
  noindex?: boolean;
  nofollow?: boolean;
  /** Open Graph type; use `article` for blog posts. */
  ogType?: "website" | "article";
  /** ISO 8601 — only with ogType article. */
  articlePublishedTime?: string;
  /** ISO 8601 — only with ogType article. */
  articleModifiedTime?: string;
  articleAuthor?: string;
  /**
   * Path or full URL. Defaults to default OG image route.
   * Example: `/jee/opengraph-image` or `https://…/blog/my-post/opengraph-image`
   */
  ogImage?: string;
  /**
   * Alternate URLs (e.g. hreflang) — merged with `canonical` (canonical from path/canonicalPath wins if not overridden).
   */
  alternates?: Metadata["alternates"];
  /** Renders `rel=prev` / `rel=next` (blog pagination). */
  pagination?: Metadata["pagination"];
};

/**
 * `title` is the full document title (include brand if you want it in the tab).
 * SEO "head" layer for App Router — use in `export const metadata` or `generateMetadata`.
 */
export function marketingPageMetadata(input: MarketingPageMetadataInput): Metadata {
  const url = absoluteUrl(input.path);
  const canonical = input.canonicalPath ? absoluteUrl(input.canonicalPath) : url;
  const og = resolveOgImage(input.ogImage);
  const ogType = input.ogType ?? "website";
  const index = !input.noindex;
  const follow = input.nofollow === true ? false : true;

  const openGraph: Metadata["openGraph"] =
    ogType === "article"
      ? {
          type: "article",
          url: canonical,
          title: input.title,
          description: input.description,
          siteName: SITE_NAME,
          locale: "en_IN",
          images: [og],
          publishedTime: input.articlePublishedTime,
          modifiedTime: input.articleModifiedTime ?? input.articlePublishedTime,
          authors: input.articleAuthor
            ? [input.articleAuthor]
            : [SITE_NAME],
        }
      : {
          type: "website",
          url: canonical,
          title: input.title,
          description: input.description,
          siteName: SITE_NAME,
          locale: "en_IN",
          images: [og],
        };

  return {
    title: { absolute: input.title },
    description: input.description,
    alternates: {
      canonical,
      ...input.alternates,
    },
    ...(input.pagination ? { pagination: input.pagination } : {}),
    openGraph,
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [og.url],
    },
    robots: { index, follow },
  };
}
