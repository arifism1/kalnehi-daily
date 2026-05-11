"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { ensureAutomatedNotifications } from "@/actions/notifications";
import { useProfileDisplayName } from "@/hooks/useProfileDisplayName";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import type { DailyMotivationalPhraseRow } from "@/lib/dailyMotivationalPhrase";

import { InstagramWelcomeBanner } from "@/components/InstagramWelcomeBanner";
import { MotivationWallpaper } from "./MotivationWallpaper";
import type { HomeDashboardBodyProps } from "./HomeDashboardBody";

const HomeDashboardBody = dynamic(
  () =>
    import("./HomeDashboardBody").then((m) => ({
      default: m.HomeDashboardBody,
    })),
  {
    loading: () => (
      <div
        className="flex flex-col gap-6 sm:gap-8"
        aria-busy="true"
        aria-label="Loading dashboard"
      >
        <div className="h-28 animate-pulse rounded-[12px] bg-kal-border/25" />
        <div className="h-8 animate-pulse rounded-lg bg-kal-border/20" />
        <div className="h-20 animate-pulse rounded-[12px] bg-kal-border/20" />
        <div className="h-64 animate-pulse rounded-[12px] bg-kal-border/20" />
        <div className="h-32 animate-pulse rounded-[12px] bg-kal-border/15" />
      </div>
    ),
  },
);

export type HomeClientProps = {
  dailyPhrase: DailyMotivationalPhraseRow | null;
};

export function HomeClient({ dailyPhrase }: HomeClientProps) {
  const router = useRouter();
  const { displayName: welcomeName } = useProfileDisplayName();

  useRefreshTasksOnHomeFocus();

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      router.prefetch("/syllabus");
      router.prefetch("/daily-plan");
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(run, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      void ensureAutomatedNotifications().catch((error) => {
        if (!cancelled) {
          console.warn("[HomeClient] ensureAutomatedNotifications failed", error);
        }
      });
    }, 3000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const firstName = useMemo(() => {
    const part = welcomeName.split(/\s+/)[0]?.trim();
    return part || "Aspirant";
  }, [welcomeName]);

  const greetingLead = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Good morning";
    if (h >= 12 && h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const bodyProps: HomeDashboardBodyProps = {
    firstName,
    greetingLead,
    dailyPhrase,
    dailyPhraseLoading: false,
  };

  return (
    <div className="relative flex min-h-full flex-col gap-5 pb-6 text-kal-text sm:gap-6 sm:pb-8">
      <MotivationWallpaper />

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <InstagramWelcomeBanner />
      </div>

      <HomeDashboardBody {...bodyProps} />
    </div>
  );
}
