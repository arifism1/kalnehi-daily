"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const StrategicHeatmapClient = dynamic(
  () =>
    import("@/components/engine/StrategicHeatmapClient").then((m) => ({
      default: m.StrategicHeatmapClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function HeatmapRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <StrategicHeatmapClient />
    </Suspense>
  );
}
