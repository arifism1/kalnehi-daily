import { kalnehiPageMetadata } from "@/lib/seo-metadata";
import { PricingPageContent } from "@/components/pricing/PricingPageContent";

export const metadata = kalnehiPageMetadata("pricing");

export default function PricingPage() {
  return <PricingPageContent />;
}
