"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const DailyPlanPageContent = dynamic(
  () =>
    import("@/components/planner/DailyPlanPageContent").then((m) => ({
      default: m.DailyPlanPageContent,
    })),
  { ssr: true, loading: () => <RoutePageSkeleton /> },
);

export default function DailyPlanRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <DailyPlanPageContent />
    </Suspense>
  );
}
