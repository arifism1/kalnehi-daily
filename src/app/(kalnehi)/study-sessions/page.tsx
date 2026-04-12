import { kalnehiPageMetadata } from "@/lib/seo-metadata";

import StudySessionsRouteLazy from "./StudySessionsRouteLazy";

export const metadata = kalnehiPageMetadata("studySessions");

export default function StudySessionsPage() {
  return <StudySessionsRouteLazy />;
}
