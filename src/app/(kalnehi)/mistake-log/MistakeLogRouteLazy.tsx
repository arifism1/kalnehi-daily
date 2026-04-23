"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const MistakeLogClient = dynamic(
  () =>
    import("@/components/mistake-log/MistakeLogClient").then((m) => ({
      default: m.MistakeLogClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function MistakeLogRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="mistake_log">
        <MistakeLogClient />
      </FeatureGate>
    </Suspense>
  );
}
