import { marketingPageMetadata } from "@/lib/marketing-seo";
import { absoluteUrl } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { LandingPageContent } from "@/components/landing/LandingPageContent";
import { LANDING_FAQ_ITEMS } from "@/lib/landing-faqs";
import { LANDING_DESCRIPTION, LANDING_TITLE, LANDING_WEB_PAGE } from "@/lib/landing-meta";

/** Marketing URL for campaigns & internal links; canonical is `/` to avoid duplicate indexing. */
export const metadata = marketingPageMetadata({
  path: "/kalnehi-daily",
  title: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
  canonicalPath: "/",
});

export default function KalnehiDailyMarketingLandingPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Kalnehi Daily", path: "/kalnehi-daily" },
        ]}
        webPage={LANDING_WEB_PAGE}
        webPageCanonicalUrl={absoluteUrl("/")}
        faqs={[...LANDING_FAQ_ITEMS]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Kalnehi Daily", path: "/kalnehi-daily" },
        ]} className="mb-2" />

      <LandingPageContent />
    </>
  );
}
