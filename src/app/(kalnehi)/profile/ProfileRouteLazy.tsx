"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const ProfilePageClient = dynamic(
  () =>
    import("@/components/profile/ProfilePageClient").then((m) => ({
      default: m.ProfilePageClient,
    })),
  { ssr: false, loading: () => <RoutePageSkeleton /> },
);

export default function ProfileRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <ProfilePageClient />
    </Suspense>
  );
}
