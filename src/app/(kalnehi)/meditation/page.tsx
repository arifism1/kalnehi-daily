import { kalnehiPageMetadata } from "@/lib/seo-metadata";

import MeditationRouteLazy from "./MeditationRouteLazy";

export const metadata = kalnehiPageMetadata("meditation");

export default function MeditationPageRoute() {
  return <MeditationRouteLazy />;
}
