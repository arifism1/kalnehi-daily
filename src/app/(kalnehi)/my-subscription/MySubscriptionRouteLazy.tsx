"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const MyPlanPageClient = dynamic(
  () =>
    import("@/components/my-plan/MyPlanPageClient").then((m) => ({
      default: m.MyPlanPageClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function MySubscriptionRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <MyPlanPageClient />
    </Suspense>
  );
}
