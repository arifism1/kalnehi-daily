"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const SettingsPageClient = dynamic(
  () =>
    import("@/components/settings/SettingsPageClient").then((m) => ({
      default: m.SettingsPageClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function SettingsRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <SettingsPageClient />
    </Suspense>
  );
}
