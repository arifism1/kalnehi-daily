import { Suspense } from "react";

import { kalnehiPageMetadata } from "@/lib/seo-metadata";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";
import MistakeLogRouteLazy from "./MistakeLogRouteLazy";

export const metadata = kalnehiPageMetadata("mistake-log");

export default function MistakeLogPage() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <MistakeLogRouteLazy />
    </Suspense>
  );
}
