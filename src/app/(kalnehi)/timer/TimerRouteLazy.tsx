"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const TimerEngineClient = dynamic(
  () =>
    import("@/components/engine/TimerEngineClient").then((m) => ({
      default: m.TimerEngineClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function TimerRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <TimerEngineClient />
    </Suspense>
  );
}
