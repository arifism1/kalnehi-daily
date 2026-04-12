import { kalnehiPageMetadata } from "@/lib/seo-metadata";

import MotivationRouteLazy from "./MotivationRouteLazy";

export const metadata = kalnehiPageMetadata("motivation");

export default function MotivationPage() {
  return <MotivationRouteLazy />;
}
