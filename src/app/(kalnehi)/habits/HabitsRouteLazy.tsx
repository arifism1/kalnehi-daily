"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { EnabledDashboardFeatureGate } from "@/components/features/EnabledDashboardFeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const HabitMakerPage = dynamic(
  () =>
    import("@/components/habits/HabitMakerPage").then((m) => ({
      default: m.HabitMakerPage,
    })),
  { ssr: true, loading: () => <RoutePageSkeleton /> },
);

export default function HabitsRouteLazy() {
  return (
    <EnabledDashboardFeatureGate featureId="habit-maker" title="Habit Maker">
      <Suspense fallback={<RoutePageSkeleton />}>
        <HabitMakerPage />
      </Suspense>
    </EnabledDashboardFeatureGate>
  );
}
