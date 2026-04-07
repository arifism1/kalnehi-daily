"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const ProductivityPlannerView = dynamic(
  () =>
    import("@/components/planner/views/ProductivityPlannerView").then((m) => ({
      default: m.ProductivityPlannerView,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function ProductivityPlannerRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <ProductivityPlannerView />
    </Suspense>
  );
}
