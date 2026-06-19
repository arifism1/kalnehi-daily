import type { Metadata } from "next";

import { FizakiLandingContent } from "@/components/fizaki/landing/FizakiLandingContent";
import { FIZAKI_FAQ_ITEMS } from "@/components/fizaki/landing/copy";
import { LandingPageContent } from "@/components/landing/LandingPageContent";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import {
  FIZAKI_LANDING_DESCRIPTION,
  FIZAKI_LANDING_TITLE,
  FIZAKI_LANDING_WEB_PAGE,
} from "@/lib/fizaki/landing-meta";
import { LANDING_FAQ_ITEMS } from "@/lib/landing-faqs";
import {
  LANDING_DESCRIPTION,
  LANDING_TITLE,
  LANDING_WEB_PAGE,
} from "@/lib/landing-meta";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { getBuildVertical } from "@/lib/vertical/resolveVertical";

export function generateMetadata(): Metadata {
  if (getBuildVertical() === "fizaki") {
    return marketingPageMetadata({
      path: "/",
      title: FIZAKI_LANDING_TITLE,
      description: FIZAKI_LANDING_DESCRIPTION,
    });
  }
  return marketingPageMetadata({
    path: "/",
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
  });
}

export default function LandingPage() {
  if (getBuildVertical() === "fizaki") {
    return (
      <>
        <MarketingPageJsonLd
          breadcrumbs={[{ name: "Home", path: "/" }]}
          webPage={FIZAKI_LANDING_WEB_PAGE}
          faqs={[...FIZAKI_FAQ_ITEMS]}
        />
        <FizakiLandingContent />
      </>
    );
  }

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
