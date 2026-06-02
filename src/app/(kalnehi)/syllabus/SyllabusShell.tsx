"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { SyllabusPageHeader } from "@/components/syllabus/SyllabusPageHeader";
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
    <div className="space-y-4">
      <SyllabusPageHeader />
      <Suspense fallback={<SyllabusPageSkeleton />}>
        <SyllabusTracker />
      </Suspense>
    </div>
  );
}
