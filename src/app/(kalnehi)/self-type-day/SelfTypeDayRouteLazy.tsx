"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const SelfTypeDayPage = dynamic(
  () =>
    import("@/components/planner/SelfTypeDayPage").then((m) => ({
      default: m.SelfTypeDayPage,
    })),
  { ssr: true, loading: () => <RoutePageSkeleton /> },
);

export default function SelfTypeDayRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <SelfTypeDayPage />
    </Suspense>
  );
}
