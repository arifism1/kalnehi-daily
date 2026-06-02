"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const HabitsPlannerView = dynamic(
  () =>
    import("@/components/planner/views/HabitsPlannerView").then((m) => ({
      default: m.HabitsPlannerView,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function HabitsPlannerRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <HabitsPlannerView />
    </Suspense>
  );
}
