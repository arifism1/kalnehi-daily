"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const DailyDebriefPageContent = dynamic(() => import("./DailyDebriefPageContent"), {
  ssr: false,
  loading: () => <RoutePageSkeleton />,
});

export default function DailyDebriefRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="daily_log">
        <DailyDebriefPageContent />
      </FeatureGate>
    </Suspense>
  );
}
