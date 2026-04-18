import PricingRouteLazy from "./PricingRouteLazy";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("pricing");

export default function PricingPage() {
  return <PricingRouteLazy />;
}
