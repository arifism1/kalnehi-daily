"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { AiFeatureGate } from "@/components/subscription/AiFeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const DictateDayPageContent = dynamic(() => import("./DictateDayPageContent"), {
  ssr: false,
  loading: () => <RoutePageSkeleton />,
});

export default function DictateDayRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <AiFeatureGate feature="voice">
        <DictateDayPageContent />
      </AiFeatureGate>
    </Suspense>
  );
}
