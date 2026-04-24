"use client";

import Link from "next/link";

import { DailyReflectionClient } from "@/components/reflection/DailyReflectionClient";

export default function DailyLogPageContent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="kal-glass-subtle rounded-2xl border border-kal-border/70 px-4 py-3 sm:px-5">
        <p className="text-sm font-medium text-kal-text">Share your day</p>
        <p className="mt-0.5 text-xs text-kal-text-secondary">
          Build a story-ready recap card with tasks, study time, and streak.
        </p>
        <Link
          href="/recap"
          className="mt-2 inline-flex text-sm font-semibold text-kal-accent underline-offset-2 hover:underline"
        >
          Open today&apos;s recap →
        </Link>
      </div>
      <DailyReflectionClient />
    </div>
  );
}
