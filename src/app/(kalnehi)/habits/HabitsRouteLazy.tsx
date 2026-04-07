"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const HabitMakerPage = dynamic(
  () =>
    import("@/components/habits/HabitMakerPage").then((m) => ({
      default: m.HabitMakerPage,
    })),
  { ssr: true, loading: () => <RoutePageSkeleton /> },
);

export default function HabitsRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <HabitMakerPage />
    </Suspense>
  );
}
