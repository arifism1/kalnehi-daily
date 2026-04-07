"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const StudySessionsPageContent = dynamic(
  () => import("./StudySessionsPageContent"),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function StudySessionsRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <StudySessionsPageContent />
    </Suspense>
  );
}
