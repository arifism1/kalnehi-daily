import type { Metadata } from "next";

import { LandingPageContent } from "@/components/landing/LandingPageContent";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { LANDING_FAQ_ITEMS } from "@/lib/landing-faqs";
import {
  LANDING_DESCRIPTION,
  LANDING_TITLE,
  LANDING_WEB_PAGE,
} from "@/lib/landing-meta";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export async function generateMetadata(): Promise<Metadata> {
  return marketingPageMetadata({
    path: "/",
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
  });
}

export default async function LandingPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }]}
        webPage={LANDING_WEB_PAGE}
        faqs={[...LANDING_FAQ_ITEMS]}
      />
      <LandingPageContent />
    </>
  );
}
