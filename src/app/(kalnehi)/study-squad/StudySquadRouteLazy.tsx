"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const StudySquadPageContent = dynamic(
  () => import("./StudySquadPageContent"),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

type StudySquadRouteLazyProps = {
  syllabusLabels: string[];
  syllabusLabelsKey: string;
};

export default function StudySquadRouteLazy({
  syllabusLabels,
  syllabusLabelsKey,
}: StudySquadRouteLazyProps) {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <StudySquadPageContent
        syllabusLabels={syllabusLabels}
        syllabusLabelsKey={syllabusLabelsKey}
      />
    </Suspense>
  );
}
