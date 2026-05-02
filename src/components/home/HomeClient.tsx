"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { ensureAutomatedNotifications } from "@/actions/notifications";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useProfileDisplayName } from "@/hooks/useProfileDisplayName";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import {
  pickDailyPhraseIndex,
  type DailyMotivationalPhraseRow,
} from "@/lib/dailyMotivationalPhrase";
import { getSupabaseBrowserClient } from "@/lib/supabase";

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

export function HomeClient() {
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
    void (async () => {
      try {
        await ensureAutomatedNotifications();
      } catch (error) {
        if (!cancelled) {
          console.warn("[HomeClient] ensureAutomatedNotifications failed", error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = useCalendarDate();

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

  const [dailyPhrase, setDailyPhrase] = useState<DailyMotivationalPhraseRow | null>(
    null,
  );
  const [dailyPhraseLoading, setDailyPhraseLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setDailyPhraseLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("daily_motivational_phrases")
          .select("id, phrase, author, category")
          .eq("active", true)
          .order("phrase", { ascending: true });
        if (cancelled) return;
        if (error || !data?.length) {
          setDailyPhrase(null);
          return;
        }
        const idx = pickDailyPhraseIndex(today, data.length);
        setDailyPhrase(data[idx] ?? null);
      } catch {
        if (!cancelled) setDailyPhrase(null);
      } finally {
        if (!cancelled) setDailyPhraseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);

  const bodyProps: HomeDashboardBodyProps = {
    firstName,
    greetingLead,
    dailyPhrase,
    dailyPhraseLoading,
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
