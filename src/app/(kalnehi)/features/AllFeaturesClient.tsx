"use client";

import { HomeFeatureGrid } from "@/components/home/HomeFeatureGrid";

export function AllFeaturesClient() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[20px] font-medium tracking-tight text-kal-text">
          All Features
        </h1>
        <p className="mt-1 text-[13px] text-kal-muted lg:hidden">
          Tap any feature to open it
        </p>
      </header>

      <HomeFeatureGrid />
    </div>
  );
}
