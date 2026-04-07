"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const TodosPlannerView = dynamic(
  () =>
    import("@/components/planner/views/TodosPlannerView").then((m) => ({
      default: m.TodosPlannerView,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function TodosPlannerRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <TodosPlannerView />
    </Suspense>
  );
}
