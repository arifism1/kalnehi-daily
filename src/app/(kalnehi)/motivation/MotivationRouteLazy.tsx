"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const PersonalMotivationPage = dynamic(
  () =>
    import("@/components/motivation/PersonalMotivationPage").then((m) => ({
      default: m.PersonalMotivationPage,
    })),
  { ssr: true, loading: () => <RoutePageSkeleton /> },
);

export default function MotivationRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <PersonalMotivationPage />
    </Suspense>
  );
}
