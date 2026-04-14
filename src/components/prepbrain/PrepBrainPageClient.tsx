"use client";

import { Brain } from "lucide-react";
import Link from "next/link";

import { PrepBrainChat } from "@/components/prepbrain/PrepBrainChat";
import { useAiGate } from "@/hooks/useAiGate";

export function PrepBrainPageClient() {
  const { loading, hasAiAccess } = useAiGate();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-pulse py-4">
        <div className="h-8 w-48 rounded-lg bg-kal-card-muted" />
        <div className="h-32 rounded-2xl bg-kal-card-muted" />
        <div className="h-48 rounded-2xl bg-kal-card-muted" />
      </div>
    );
  }

  if (!hasAiAccess) {
    return (
      <div className="kal-glass-panel mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl px-5 py-8 text-center sm:px-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kal-card-muted text-kal-text-secondary ring-1 ring-kal-border">
          <Brain className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="kal-feature-title">PrepBrain AI is a Pro feature</h1>
        <p className="max-w-sm text-sm text-kal-text-secondary">
          Upgrade to Pro or Pro Max for a personalized coach that understands your syllabus,
          daily planner, habits, and more.
        </p>
        <Link
          href="/pricing"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-kal-accent px-6 py-2.5 text-sm font-bold text-kal-accent-foreground"
        >
          View Plans
        </Link>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl px-0.5 sm:px-0">
      <PrepBrainChat />
    </div>
  );
}
