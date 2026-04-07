"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const WeeklyPlannerView = dynamic(
  () =>
    import("@/components/planner/views/WeeklyPlannerView").then((m) => ({
      default: m.WeeklyPlannerView,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function WeeklyPlannerRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <WeeklyPlannerView />
    </Suspense>
  );
}
