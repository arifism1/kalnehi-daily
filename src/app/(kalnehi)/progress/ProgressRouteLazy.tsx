"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const ProgressPageContent = dynamic(() => import("./ProgressPageContent"), {
  ssr: false,
  loading: () => <RoutePageSkeleton />,
});

export default function ProgressRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <ProgressPageContent />
    </Suspense>
  );
}
