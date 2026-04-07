"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const PendingTasksClient = dynamic(
  () =>
    import("@/components/engine/PendingTasksClient").then((m) => ({
      default: m.PendingTasksClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function PendingRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <PendingTasksClient />
    </Suspense>
  );
}
