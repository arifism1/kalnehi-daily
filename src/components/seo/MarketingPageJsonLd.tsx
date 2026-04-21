import { absoluteUrl, getSiteUrl } from "@/lib/site";

type Crumb = { name: string; path: string };

type Faq = { question: string; answer: string };

type Props = {
  breadcrumbs: Crumb[];
  faqs?: Faq[];
  /** Emits WebPage + ties to site WebSite (helps Google understand the primary marketing document). */
  webPage?: { name: string; description: string };
  /** When HTML `rel=canonical` points elsewhere, set WebPage `url` to that canonical absolute URL. */
  webPageCanonicalUrl?: string;
};

/**
 * BreadcrumbList + optional FAQPage / WebPage for public marketing URLs.
 */
export function MarketingPageJsonLd({
  breadcrumbs,
  faqs,
  webPage,
  webPageCanonicalUrl,
}: Props) {
  const pagePath = breadcrumbs[breadcrumbs.length - 1]?.path ?? "/";
  const pageUrl = absoluteUrl(pagePath);
  const site = getSiteUrl();
  const webPageUrl = webPageCanonicalUrl ?? pageUrl;

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
  ];

  if (webPage) {
    graph.push({
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      name: webPage.name,
      description: webPage.description,
      url: webPageUrl,
      isPartOf: { "@id": `${site}/#website` },
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
    });
  }

  if (faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    });
  }

  const json = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
