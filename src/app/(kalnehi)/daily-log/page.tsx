import { Suspense } from "react";

import { kalnehiPageMetadata } from "@/lib/seo-metadata";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";
import DailyLogRouteLazy from "./DailyLogRouteLazy";

export const metadata = kalnehiPageMetadata("daily-log");

export default function DailyLogPage() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <DailyLogRouteLazy />
    </Suspense>
  );
}
