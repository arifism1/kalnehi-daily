"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const MockTestsClient = dynamic(
  () =>
    import("@/components/mock-tests/MockTestsClient").then((m) => ({
      default: m.MockTestsClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function MockTestsRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="mock_tests">
        <MockTestsClient />
      </FeatureGate>
    </Suspense>
  );
}
