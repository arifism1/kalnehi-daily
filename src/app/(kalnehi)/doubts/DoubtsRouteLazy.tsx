"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const DoubtTracker = dynamic(
  () =>
    import("@/components/doubts/DoubtTracker").then((m) => ({
      default: m.DoubtTracker,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function DoubtsRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="doubts">
        <DoubtTracker />
      </FeatureGate>
    </Suspense>
  );
}
