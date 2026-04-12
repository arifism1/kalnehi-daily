import { kalnehiPageMetadata } from "@/lib/seo-metadata";

import TimerRouteLazy from "./TimerRouteLazy";

export const metadata = kalnehiPageMetadata("timer");

export default function TimerPage() {
  return <TimerRouteLazy />;
}
