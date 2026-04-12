import { kalnehiPageMetadata } from "@/lib/seo-metadata";

import ProgressRouteLazy from "./ProgressRouteLazy";

export const metadata = kalnehiPageMetadata("progress");

export default function ProgressPage() {
  return <ProgressRouteLazy />;
}
