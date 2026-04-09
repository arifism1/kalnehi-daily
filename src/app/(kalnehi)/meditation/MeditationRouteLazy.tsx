"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const MeditationPage = dynamic(
  () =>
    import("@/components/meditation/MeditationPage").then((m) => ({
      default: m.MeditationPage,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function MeditationRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <MeditationPage />
    </Suspense>
  );
}
