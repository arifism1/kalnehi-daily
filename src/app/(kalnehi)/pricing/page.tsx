import { PricingPageClient } from "@/components/pricing/PricingPageClient";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("pricing");

export default function PricingPage() {
  return <PricingPageClient />;
}
