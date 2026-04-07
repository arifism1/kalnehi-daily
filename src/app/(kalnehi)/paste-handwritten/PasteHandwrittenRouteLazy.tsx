"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const PasteHandwrittenPageContent = dynamic(
  () => import("./PasteHandwrittenPageContent"),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function PasteHandwrittenRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <PasteHandwrittenPageContent />
    </Suspense>
  );
}
