"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const NotificationsEngineClient = dynamic(
  () =>
    import("@/components/engine/NotificationsEngineClient").then((m) => ({
      default: m.NotificationsEngineClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function NotificationsRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <NotificationsEngineClient />
    </Suspense>
  );
}
