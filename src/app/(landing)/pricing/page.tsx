import { kalnehiPageMetadata } from "@/lib/seo-metadata";
import { getDailyCapStatus } from "@/lib/daily-trial-cap";
import { PricingPageContent } from "@/components/pricing/PricingPageContent";

export const metadata = kalnehiPageMetadata("pricing");

export default async function PricingPage() {
  const capStatus = await getDailyCapStatus();
  return <PricingPageContent capStatus={capStatus} />;
}
