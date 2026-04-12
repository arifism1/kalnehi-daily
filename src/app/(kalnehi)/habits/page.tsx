import { kalnehiPageMetadata } from "@/lib/seo-metadata";

import HabitsRouteLazy from "./HabitsRouteLazy";

export const metadata = kalnehiPageMetadata("habits");

export default function HabitsPage() {
  return <HabitsRouteLazy />;
}
