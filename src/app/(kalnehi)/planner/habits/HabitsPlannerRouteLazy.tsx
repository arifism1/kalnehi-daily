"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { EnabledDashboardFeatureGate } from "@/components/features/EnabledDashboardFeatureGate";
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
    <EnabledDashboardFeatureGate featureId="habit-maker" title="Planner habits">
      <Suspense fallback={<RoutePageSkeleton />}>
        <HabitsPlannerView />
      </Suspense>
    </EnabledDashboardFeatureGate>
  );
}
