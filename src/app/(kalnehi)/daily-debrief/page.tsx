import { Suspense } from "react";

import { kalnehiPageMetadata } from "@/lib/seo-metadata";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";
import DailyDebriefRouteLazy from "./DailyDebriefRouteLazy";

export const metadata = kalnehiPageMetadata("daily-debrief");

export default function DailyDebriefPage() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <DailyDebriefRouteLazy />
    </Suspense>
  );
}
