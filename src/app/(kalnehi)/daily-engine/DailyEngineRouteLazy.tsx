"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const DailyEngineClient = dynamic(
  () =>
    import("@/components/engine/DailyEngineClient").then((m) => ({
      default: m.DailyEngineClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function DailyEngineRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="execution_planner">
        <DailyEngineClient />
      </FeatureGate>
    </Suspense>
  );
}
