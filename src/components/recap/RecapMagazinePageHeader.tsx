"use client";

import type { ReactNode } from "react";

import { RecapPeriodNav, type RecapPeriod } from "@/components/recap/RecapPeriodNav";

export type RecapMagazinePageHeaderProps = {
  period: RecapPeriod;
  title: string;
  subtitle: ReactNode;
};

export function RecapMagazinePageHeader({
  period,
  title,
  subtitle,
}: RecapMagazinePageHeaderProps) {
  return (
    <header>
      <div className="flex flex-col gap-3 min-[361px]:flex-row min-[361px]:items-start min-[361px]:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="kal-section-heading">{title}</h1>
          <p className="mt-1 text-sm text-kal-text-secondary">{subtitle}</p>
        </div>
        <RecapPeriodNav
          active={period}
          className="w-full shrink-0 min-[361px]:w-auto"
        />
      </div>
    </header>
  );
}
