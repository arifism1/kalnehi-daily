"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const SyllabusTracker = dynamic(
  () =>
    import("@/components/syllabus/SyllabusTracker").then((m) => ({
      default: m.SyllabusTracker,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export function SyllabusShell() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <SyllabusTracker />
    </Suspense>
  );
}
