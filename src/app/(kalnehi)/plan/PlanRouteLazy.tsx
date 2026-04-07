"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const PlanPageContent = dynamic(() => import("./PlanPageContent"), {
  ssr: false,
  loading: () => <RoutePageSkeleton />,
});

export default function PlanRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <PlanPageContent />
    </Suspense>
  );
}
