import PrepBrainRouteLazy from "./PrepBrainRouteLazy";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("prepbrain");

export default function PrepBrainPage() {
  return <PrepBrainRouteLazy />;
}
