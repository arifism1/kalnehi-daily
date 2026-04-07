"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const FeedbackEngineClient = dynamic(
  () =>
    import("@/components/engine/FeedbackEngineClient").then((m) => ({
      default: m.FeedbackEngineClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function FeedbackRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <FeedbackEngineClient />
    </Suspense>
  );
}
