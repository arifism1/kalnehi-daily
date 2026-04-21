"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const RevisionRemindersPageClient = dynamic(
  () =>
    import("@/components/revision/RevisionRemindersPageClient").then((m) => ({
      default: m.RevisionRemindersPageClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function RevisionRemindersRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="revision">
        <RevisionRemindersPageClient />
      </FeatureGate>
    </Suspense>
  );
}
