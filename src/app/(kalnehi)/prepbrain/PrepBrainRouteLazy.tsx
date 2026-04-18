"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const PrepBrainPageClient = dynamic(
  () =>
    import("@/components/prepbrain/PrepBrainPageClient").then((m) => ({
      default: m.PrepBrainPageClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function PrepBrainRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <PrepBrainPageClient />
    </Suspense>
  );
}
