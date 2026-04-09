"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const MarksEngineClient = dynamic(
  () =>
    import("@/components/engine/MarksEngineClient").then((m) => ({
      default: m.MarksEngineClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function MarksEngineRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="marks_engine">
        <MarksEngineClient />
      </FeatureGate>
    </Suspense>
  );
}
