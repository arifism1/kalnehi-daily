"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const DictateDayPageContent = dynamic(() => import("./DictateDayPageContent"), {
  ssr: false,
  loading: () => <RoutePageSkeleton />,
});

export default function DictateDayRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <DictateDayPageContent />
    </Suspense>
  );
}
