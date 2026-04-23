"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { ensureAutomatedNotifications } from "@/actions/notifications";
import { ensureFreeTrialStarted } from "@/actions/subscription";
import Link from "next/link";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import {
  pickDailyPhraseIndex,
  type DailyMotivationalPhraseRow,
} from "@/lib/dailyMotivationalPhrase";
import { toUserFacingMessage } from "@/lib/userFacingErrors";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

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
  const user = useAuthStore((s) => s.user);
  const {
    welcomeTrialEligibleUnstarted,
    onboardingDone,
    refetch,
  } = useSubscriptionAccess();

  const [trialBusy, setTrialBusy] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [capReachedState, setCapReachedState] = useState<{
    resetsAt: string;
    hoursUntilReset: number;
    queued: boolean;
    queuedFor: string;
  } | null>(null);

  // Live countdown to IST midnight when cap is full.
  const [countdown, setCountdown] = useState<{ h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!capReachedState) {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const diff = new Date(capReachedState.resetsAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown({ h: 0, m: 0, s: 0 });
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      setCountdown({
        h: Math.floor(totalSec / 3600),
        m: Math.floor((totalSec % 3600) / 60),
        s: totalSec % 60,
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [capReachedState]);

  const startFreeTrial = useCallback(async () => {
    setTrialBusy(true);
    setTrialError(null);
    setCapReachedState(null);
    try {
      const r = await ensureFreeTrialStarted();
      if (!r.ok) {
        if (r.error === "daily_cap_reached") {
          const capResult = r as { ok: false; error: "daily_cap_reached"; queued: boolean; queuedFor: string; resetsAt: string; hoursUntilReset: number };
          setCapReachedState({
            resetsAt: capResult.resetsAt,
            hoursUntilReset: capResult.hoursUntilReset,
            queued: capResult.queued,
            queuedFor: capResult.queuedFor,
          });
          return;
        }
        setTrialError(r.error);
        return;
      }
      if (r.started) refetch();
    } catch (e) {
      setTrialError(toUserFacingMessage(e));
    } finally {
      setTrialBusy(false);
    }
  }, [refetch]);

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

      {welcomeTrialEligibleUnstarted && onboardingDone && (
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          {capReachedState ? (
            /* ── Cap full: queued confirmation with countdown ─────────────────── */
            <div className="kal-glass-panel rounded-2xl border-2 border-kal-border/60 bg-kal-card-muted/60 px-5 py-5 text-center">
              {capReachedState.queued ? (
                <>
                  <p className="text-sm font-semibold text-kal-text">
                    You&rsquo;re on tomorrow&rsquo;s list.
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-kal-text-secondary">
                    Your free trial will auto-activate at midnight IST. We&rsquo;ll email you when it&rsquo;s ready.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-kal-text">
                    Today&rsquo;s free spots are full.
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-kal-text-secondary">
                    New spots open at midnight IST
                  </p>
                </>
              )}
              {countdown && (
                <p className="mt-2 text-lg font-bold tabular-nums text-kal-text">
                  {String(countdown.h).padStart(2, "0")}:
                  {String(countdown.m).padStart(2, "0")}:
                  {String(countdown.s).padStart(2, "0")}
                </p>
              )}
              <p className="mt-1 text-[11px] text-kal-text-secondary">
                12:00 AM IST
                {typeof window !== "undefined" && (() => {
                  try {
                    const local = new Intl.DateTimeFormat(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZoneName: "short",
                    }).format(new Date(capReachedState.resetsAt));
                    return ` (${local} your time)`;
                  } catch {
                    return "";
                  }
                })()}
              </p>
              <div className="my-4 flex items-center gap-3 text-xs text-kal-text-secondary">
                <span className="h-px flex-1 bg-kal-border/40" />
                <span>or skip the wait</span>
                <span className="h-px flex-1 bg-kal-border/40" />
              </div>
              <Link
                href="/waitlist/position"
                className="kal-btn-accent inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition hover:brightness-105"
              >
                Start right now for ₹19
              </Link>
              <p className="mt-2 text-[11px] text-kal-text-secondary">
                Same 3 days. Instant access.
              </p>
            </div>
          ) : (
            /* ── Normal: start trial button ───────────────────────────────────── */
            <div className="kal-glass-panel rounded-2xl border-2 border-emerald-500/35 bg-emerald-500/[0.06] px-5 py-5 text-center dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]">
              <p className="text-sm font-semibold text-kal-text">
                Start your 3-day free trial — every feature, no card required.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-kal-text-secondary">
                Your trial timer starts only after you tap this button.
              </p>
              {trialError && (
                <p className="mt-2 text-xs font-medium text-kal-accent-dark dark:text-kal-accent">
                  {trialError}
                </p>
              )}
              <button
                type="button"
                onClick={() => { void startFreeTrial(); }}
                disabled={trialBusy}
                className="kal-btn-accent mt-4 inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition disabled:opacity-60"
              >
                {trialBusy ? "Starting…" : "Start Free Trial — 3 Days"}
              </button>
            </div>
          )}
        </div>
      )}

      <HomeDashboardBody {...bodyProps} />
    </div>
  );
}
