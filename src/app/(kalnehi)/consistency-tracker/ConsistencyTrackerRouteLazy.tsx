"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const CalendarEngineClient = dynamic(
  () =>
    import("@/components/engine/CalendarEngineClient").then((m) => ({
      default: m.CalendarEngineClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function ConsistencyTrackerRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="consistency_tracker">
        <CalendarEngineClient />
      </FeatureGate>
    </Suspense>
  );
}
