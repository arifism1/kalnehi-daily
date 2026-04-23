import { absoluteUrl, getSiteUrl } from "@/lib/site";
import { SITE_NAME, OG_IMAGE_PATH } from "@/lib/seo-metadata";

interface ArticleJsonLdProps {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  /** ISO 8601 date string */
  modifiedAt?: string;
  authorName?: string;
  breadcrumbs: { name: string; path: string }[];
  faqs?: { question: string; answer: string }[];
  /** Full URL for post OG / rich results image */
  imageUrl?: string;
}

export function ArticleJsonLd({
  slug,
  title,
  description,
  publishedAt,
  modifiedAt,
  authorName = "Kalnehi Daily",
  breadcrumbs,
  faqs,
  imageUrl: imageOverride,
}: ArticleJsonLdProps) {
  const pageUrl = absoluteUrl(`/blog/${slug}`);
  const site = getSiteUrl();
  const ogImage = imageOverride ?? absoluteUrl(OG_IMAGE_PATH);

  const itemListElement = breadcrumbs.map((c, i) => ({
    "@type": "ListItem" as const,
    position: i + 1,
    name: c.name,
    item: absoluteUrl(c.path),
  }));

  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement,
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      headline: title,
      description,
      url: pageUrl,
      datePublished: publishedAt,
      dateModified: modifiedAt ?? publishedAt,
      author: {
        "@type": "Organization",
        name: authorName,
        url: site,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: site,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/icon-512x512.png"),
        },
      },
      image: {
        "@type": "ImageObject",
        url: ogImage,
        width: 1200,
        height: 630,
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
      isPartOf: { "@id": `${site}/#website` },
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
    },
  ];

  if (faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c"),
      }}
    />
  );
}
