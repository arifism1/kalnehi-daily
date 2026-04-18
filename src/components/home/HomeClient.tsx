"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { ensureAutomatedNotifications } from "@/actions/notifications";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import {
  pickDailyPhraseIndex,
  type DailyMotivationalPhraseRow,
} from "@/lib/dailyMotivationalPhrase";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

import { MotivationWallpaper } from "./MotivationWallpaper";

const HomeDashboardBody = dynamic(
  () =>
    import("./HomeDashboardBody").then((m) => ({
      default: m.HomeDashboardBody,
    })),
  {
    loading: () => (
      <div
        className="flex flex-col gap-6 sm:gap-8 md:gap-10"
        aria-busy="true"
        aria-label="Loading dashboard"
      >
        <div className="h-40 animate-pulse rounded-[1rem] bg-kal-border/25 sm:h-44 sm:rounded-[1.25rem]" />
        <div className="h-52 animate-pulse rounded-[1rem] bg-kal-border/20 sm:rounded-[1.25rem]" />
        <div className="h-36 animate-pulse rounded-[1rem] bg-kal-border/20 sm:rounded-[1.25rem]" />
      </div>
    ),
  },
);

export function HomeClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useRefreshTasksOnHomeFocus();

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      router.prefetch("/syllabus");
      router.prefetch("/plan-my-day");
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

  const welcomeName = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const fromMeta =
      (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta?.name === "string" && meta.name.trim()) ||
      null;
    if (fromMeta) return fromMeta;
    if (typeof user?.email === "string" && user.email.includes("@")) {
      return user.email.split("@")[0] ?? "Aspirant";
    }
    return "Aspirant";
  }, [user]);

  const firstName = useMemo(() => {
    const part = welcomeName.split(/\s+/)[0]?.trim();
    return part || "Aspirant";
  }, [welcomeName]);

  const greetingLead = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Good morning";
    return "Hi";
  })();

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

  return (
    <div className="relative flex min-h-full flex-col gap-6 pb-10 text-kal-text sm:gap-8 md:gap-10 md:pb-14">
      <MotivationWallpaper />
      <header className="kal-glass-panel relative z-[1] overflow-hidden rounded-[1rem] px-5 py-6 sm:rounded-[1.25rem] sm:px-8 sm:py-7 lg:px-10 lg:py-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-kal-accent/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-kal-accent/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-4 sm:gap-5">
          <div className="space-y-1 sm:space-y-1.5">
            <h1 className="text-[1.4rem] font-semibold leading-tight tracking-tight text-kal-text sm:text-2xl md:text-[1.75rem]">
              Welcome to Kalnehi
            </h1>
            <p className="text-sm text-kal-muted sm:text-[0.95rem]">
              <span className="text-kal-text">{`${greetingLead}, ${firstName}`}</span>
            </p>
          </div>

          <div className="border-t border-kal-border/80 pt-4 sm:pt-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:text-[0.68rem]">
              Today&apos;s line
            </p>
            <blockquote
              className={`relative mt-2 max-w-3xl text-[1rem] font-medium leading-snug text-kal-text sm:mt-2.5 sm:text-[1.0625rem] sm:leading-snug md:text-lg md:leading-snug ${dailyPhraseLoading ? "opacity-40" : ""}`}
            >
              {dailyPhraseLoading ? (
                <span className="block min-h-[2.75rem] w-full max-w-2xl animate-pulse rounded-lg bg-kal-border/35 sm:min-h-[3.25rem]" />
              ) : dailyPhrase ? (
                <>
                  <span className="text-kal-accent">&ldquo;</span>
                  {dailyPhrase.phrase}
                  <span className="text-kal-accent">&rdquo;</span>
                  {dailyPhrase.author ? (
                    <footer className="mt-2 text-xs font-normal not-italic text-kal-muted sm:mt-2.5 sm:text-sm">
                      — {dailyPhrase.author}
                    </footer>
                  ) : null}
                </>
              ) : (
                <span className="text-kal-muted">
                  Small daily wins stack into the rank you are building—open your plan
                  and take the next honest step.
                </span>
              )}
            </blockquote>
          </div>
        </div>
      </header>

      <HomeDashboardBody />
    </div>
  );
}
