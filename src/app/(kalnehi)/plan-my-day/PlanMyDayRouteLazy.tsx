"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const PlanMyDayPage = dynamic(
  () =>
    import("@/components/planner/PlanMyDayPage").then((m) => ({
      default: m.PlanMyDayPage,
    })),
  { ssr: true, loading: () => <RoutePageSkeleton /> },
);

export default function PlanMyDayRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <PlanMyDayPage />
    </Suspense>
  );
}
