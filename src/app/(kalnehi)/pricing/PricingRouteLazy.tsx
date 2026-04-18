"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const PricingPageClient = dynamic(
  () =>
    import("@/components/pricing/PricingPageClient").then((m) => ({
      default: m.PricingPageClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function PricingRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <PricingPageClient />
    </Suspense>
  );
}
