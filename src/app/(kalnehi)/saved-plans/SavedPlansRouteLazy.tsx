"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const SavedPlansPageContent = dynamic(
  () =>
    import("@/components/planner/SavedPlansPageContent").then((m) => ({
      default: m.SavedPlansPageContent,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function SavedPlansRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <SavedPlansPageContent />
    </Suspense>
  );
}
