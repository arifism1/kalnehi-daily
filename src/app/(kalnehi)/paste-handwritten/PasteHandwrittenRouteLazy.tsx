"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { AiFeatureGate } from "@/components/subscription/AiFeatureGate";
import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const PasteHandwrittenPageContent = dynamic(
  () => import("./PasteHandwrittenPageContent"),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function PasteHandwrittenRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <AiFeatureGate feature="photo_scan">
        <PasteHandwrittenPageContent />
      </AiFeatureGate>
    </Suspense>
  );
}
