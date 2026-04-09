"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const DailyLogPageContent = dynamic(() => import("./DailyLogPageContent"), {
  ssr: false,
  loading: () => <RoutePageSkeleton />,
});

export default function DailyLogRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeatureGate feature="daily_log">
        <DailyLogPageContent />
      </FeatureGate>
    </Suspense>
  );
}
