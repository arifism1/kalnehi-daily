import {
  AGGREGATE_RATING,
  ORGANIZATION_DESCRIPTION,
  ORGANIZATION_LOGO_PATH,
  PRICING_OFFERS,
  SITE_ALTERNATE_NAME,
  SOCIAL_SAME_AS,
  SOFTWARE_APP_DESCRIPTION,
  WEB_SITE_DESCRIPTIVE_NAME,
} from "@/config/site";
import { absoluteUrl, getSiteUrl } from "@/lib/site";
import { SITE_TAGLINE } from "@/lib/seo-metadata";

/**
 * Organization + WebSite (with SiteLinks search box) + SoftwareApplication
 * for Google rich results. Global — emitted once in root layout.
 */
export function JsonLd() {
  const site = getSiteUrl();
  const logo = absoluteUrl(ORGANIZATION_LOGO_PATH);
  const orgId = `${site}/#organization`;
  const websiteId = `${site}/#website`;
  const appId = `${site}/#app`;
  const searchEntry = `${site}/search?q={search_term_string}`;

  const offerNodes: Record<string, unknown>[] = PRICING_OFFERS.map((o, index) => {
    const id = `${site}/#offer-${index + 1}`;
    const base: Record<string, unknown> = {
      "@id": id,
      "@type": "Offer",
      name: o.name,
      price: o.price,
      priceCurrency: o.priceCurrency,
      description: o.description,
    };
    if ("unitCode" in o && o.unitCode) {
      base.priceSpecification = {
        "@type": "UnitPriceSpecification",
        price: o.price,
        priceCurrency: o.priceCurrency,
        unitCode: o.unitCode,
      };
    }
    return base;
  });

  const softwareOffers = offerNodes.map((o) => ({ "@id": o["@id"] as string }));
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": orgId,
      name: WEB_SITE_DESCRIPTIVE_NAME,
      alternateName: SITE_ALTERNATE_NAME,
      url: site,
      description: ORGANIZATION_DESCRIPTION,
      foundingDate: "2026",
      areaServed: "IN",
      sameAs: [...SOCIAL_SAME_AS],
      logo: {
        "@type": "ImageObject",
        url: logo,
        width: 512,
        height: 512,
      },
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: WEB_SITE_DESCRIPTIVE_NAME,
      alternateName: SITE_ALTERNATE_NAME,
      url: site,
      description: `${WEB_SITE_DESCRIPTIVE_NAME}: ${SITE_TAGLINE}`,
      publisher: { "@id": orgId },
      inLanguage: "en-IN",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: searchEntry,
        },
        "query-input": "required name=search_term_string",
      },
    },
    ...offerNodes,
    {
      "@type": "SoftwareApplication",
      "@id": appId,
      name: WEB_SITE_DESCRIPTIVE_NAME,
      applicationCategory: "EducationApplication",
      operatingSystem: "Web, iOS, Android",
      description: SOFTWARE_APP_DESCRIPTION,
      image: logo,
      url: site,
      author: { "@id": orgId },
      offers: softwareOffers,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: AGGREGATE_RATING.ratingValue,
        ratingCount: AGGREGATE_RATING.ratingCount,
        bestRating: AGGREGATE_RATING.bestRating,
        worstRating: AGGREGATE_RATING.worstRating,
      },
    },
  ];

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
