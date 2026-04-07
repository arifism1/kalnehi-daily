"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const SchedulePlannerView = dynamic(
  () =>
    import("@/components/planner/views/SchedulePlannerView").then((m) => ({
      default: m.SchedulePlannerView,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function SchedulePlannerRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <SchedulePlannerView />
    </Suspense>
  );
}
