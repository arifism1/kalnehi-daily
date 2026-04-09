"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const RevisionEngineClient = dynamic(
  () =>
    import("@/components/engine/RevisionEngineClient").then((m) => ({
      default: m.RevisionEngineClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function RevisionRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="revision">
        <RevisionEngineClient />
      </FeatureGate>
    </Suspense>
  );
}
