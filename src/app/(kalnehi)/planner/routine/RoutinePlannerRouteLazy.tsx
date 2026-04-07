"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const RoutinePlannerView = dynamic(
  () =>
    import("@/components/planner/views/RoutinePlannerView").then((m) => ({
      default: m.RoutinePlannerView,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function RoutinePlannerRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <RoutinePlannerView />
    </Suspense>
  );
}
