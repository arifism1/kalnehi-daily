"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { SyllabusPageSkeleton } from "@/components/syllabus/SyllabusPageSkeleton";

const SyllabusTracker = dynamic(
  () =>
    import("@/components/syllabus/SyllabusTracker").then((m) => ({
      default: m.SyllabusTracker,
    })),
  { ssr: false, loading: () => <SyllabusPageSkeleton /> },
);

export function SyllabusShell() {
  return (
    <Suspense fallback={<SyllabusPageSkeleton />}>
      <SyllabusTracker />
    </Suspense>
  );
}
