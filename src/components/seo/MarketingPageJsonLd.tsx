import { absoluteUrl } from "@/lib/site";

type Crumb = { name: string; path: string };

type Faq = { question: string; answer: string };

type Props = {
  breadcrumbs: Crumb[];
  faqs?: Faq[];
};

/**
 * BreadcrumbList + optional FAQPage for public marketing URLs.
 */
export function MarketingPageJsonLd({ breadcrumbs, faqs }: Props) {
  const itemListElement = breadcrumbs.map((c, i) => ({
    "@type": "ListItem" as const,
    position: i + 1,
    name: c.name,
    item: absoluteUrl(c.path),
  }));

  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      "@id": `${absoluteUrl(breadcrumbs[breadcrumbs.length - 1]?.path ?? "/")}#breadcrumb`,
      itemListElement,
    },
  ];

  if (faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${absoluteUrl(breadcrumbs[breadcrumbs.length - 1]?.path ?? "/")}#faq`,
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
