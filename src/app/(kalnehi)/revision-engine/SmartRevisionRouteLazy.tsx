"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const SmartRevisionEngineClient = dynamic(
  () =>
    import("@/components/revision/SmartRevisionEngineClient").then((m) => ({
      default: m.SmartRevisionEngineClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function SmartRevisionRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="revision">
        <SmartRevisionEngineClient />
      </FeatureGate>
    </Suspense>
  );
}
