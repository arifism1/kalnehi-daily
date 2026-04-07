"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

const ProfilePageContent = dynamic(() => import("./ProfilePageContent"), {
  ssr: false,
  loading: () => <RoutePageSkeleton />,
});

export default function ProfileRouteLazy() {
  return (
    <Suspense fallback={<RoutePageSkeleton />}>
      <ProfilePageContent />
    </Suspense>
  );
}
