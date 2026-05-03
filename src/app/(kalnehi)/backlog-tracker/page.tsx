import { kalnehiPageMetadata } from "@/lib/seo-metadata";

import { BacklogTrackerClient } from "@/components/backlog/BacklogTrackerClient";

export const metadata = kalnehiPageMetadata("backlogTracker");

export default function BacklogTrackerPage() {
  return <BacklogTrackerClient />;
}
