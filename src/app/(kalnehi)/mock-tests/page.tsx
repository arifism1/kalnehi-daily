import { Suspense } from "react";

import { kalnehiPageMetadata } from "@/lib/seo-metadata";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";
import MockTestsRouteLazy from "./MockTestsRouteLazy";

export const metadata = kalnehiPageMetadata("mock-tests");

export default function MockTestsPage() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <MockTestsRouteLazy />
    </Suspense>
  );
}
