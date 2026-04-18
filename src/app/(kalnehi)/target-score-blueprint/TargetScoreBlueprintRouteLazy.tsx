"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const TargetScoreBlueprintClient = dynamic(
  () =>
    import("@/components/targetScoreBlueprint/TargetScoreBlueprintClient").then((m) => ({
      default: m.TargetScoreBlueprintClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function TargetScoreBlueprintRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <TargetScoreBlueprintClient />
    </Suspense>
  );
}
