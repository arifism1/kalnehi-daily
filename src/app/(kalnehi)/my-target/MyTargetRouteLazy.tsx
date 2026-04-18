"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const MyTargetClient = dynamic(
  () =>
    import("@/components/myTarget/MyTargetClient").then((m) => ({
      default: m.MyTargetClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function MyTargetRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <MyTargetClient />
    </Suspense>
  );
}
