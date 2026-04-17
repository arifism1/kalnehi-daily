"use client";

import { ArrowLeft, CalendarDays, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { UnifiedDailyPlanList } from "@/components/planner/UnifiedDailyPlanList";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import {
  getSavedPlansDateWindow,
  SAVED_PLANS_FILTER_OPTIONS,
  SAVED_PLANS_PAGE_SIZE,
  type SavedPlanListItem,
  type SavedPlanListRowRaw,
  type SavedPlansDateWindow,
  type SavedPlansFilterId,
  toSavedPlanListItem,
  validateSavedPlansCustomRange,
} from "@/lib/savedPlans";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { toUserFacingMessage } from "@/lib/userFacingErrors";

export function SavedPlansPageContent() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();

  const [activeFilter, setActiveFilter] = useState<SavedPlansFilterId>("last1Year");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [appliedCustomWindow, setAppliedCustomWindow] = useState<SavedPlansDateWindow | null>(
    null,
  );
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);
  const [items, setItems] = useState<SavedPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlanDate, setExpandedPlanDate] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const dateWindow = useMemo(
    () => appliedCustomWindow ?? getSavedPlansDateWindow(activeFilter),
    [activeFilter, appliedCustomWindow],
  );

  const loadPage = useCallback(
    async (page: number, mode: "replace" | "append") => {
      if (!user?.id) {
        setItems([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      if (mode === "replace") {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);
      try {
        const from = page * SAVED_PLANS_PAGE_SIZE;
        const to = from + SAVED_PLANS_PAGE_SIZE - 1;
        const supabase = getSupabaseBrowserClient();
        const { data, error: queryError } = await supabase
          .from("daily_plans")
          .select("id, plan_date, daily_tasks(status, title)")
          .eq("user_id", user.id)
          .gte("plan_date", dateWindow.startDate)
          .lte("plan_date", dateWindow.endDate)
          .order("plan_date", { ascending: false })
          .range(from, to);

        if (queryError) throw queryError;
        const mapped = ((data ?? []) as SavedPlanListRowRaw[]).map(toSavedPlanListItem);
        setHasMore(mapped.length === SAVED_PLANS_PAGE_SIZE);
        setPageIndex(page);
        setItems((prev) => (mode === "replace" ? mapped : [...prev, ...mapped]));
      } catch (err) {
        setError(toUserFacingMessage(err));
        if (mode === "replace") {
          setItems([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [dateWindow.endDate, dateWindow.startDate, user?.id],
  );

  useEffect(() => {
    setExpandedPlanDate(null);
    void loadPage(0, "replace");
  }, [dateWindow.endDate, dateWindow.startDate, loadPage]);

  const customRangeValidation = useMemo(
    () => validateSavedPlansCustomRange(customStartDate, customEndDate),
    [customEndDate, customStartDate],
  );

  const hasAnyCustomDateInput = customStartDate.length > 0 || customEndDate.length > 0;
  const liveCustomRangeError =
    hasAnyCustomDateInput && !customRangeValidation.ok
      ? customRangeValidation.error
      : null;
  const canApplyCustomRange = customRangeValidation.ok && !loading && !loadingMore;

  const handleApplyCustomRange = () => {
    if (!customRangeValidation.ok) {
      setCustomRangeError(customRangeValidation.error);
      return;
    }
    setCustomRangeError(null);
    setAppliedCustomWindow(customRangeValidation.window);
  };

  const handlePresetFilterClick = (filterId: SavedPlansFilterId) => {
    setActiveFilter(filterId);
    setAppliedCustomWindow(null);
    setCustomRangeError(null);
  };

  const showEmptyState = !loading && !error && items.length === 0;

  if (!user) {
    return (
      <p className="mx-auto max-w-lg rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        Sign in to view saved daily plans.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16 pt-2 sm:space-y-7 sm:pt-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-kal-accent hover:text-kal-accent-hover"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Home
      </Link>

      <header className="kal-glass-panel rounded-3xl px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-5 w-5 text-kal-accent" aria-hidden />
          <h1 className="kal-feature-title">Saved Daily Plans</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-kal-muted">
          Browse your full daily-plan archive in chronological order, with completion stats
          and quick previews.
        </p>
      </header>

      <section className="kal-glass-panel rounded-3xl px-4 py-4 sm:px-5">
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-kal-muted">Start date</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                if (customRangeError) setCustomRangeError(null);
              }}
              className="min-h-[40px] rounded-xl border border-kal-border bg-kal-card-muted/60 px-3 text-sm text-kal-text outline-none transition-colors focus:border-kal-accent/50"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-kal-muted">End date</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                if (customRangeError) setCustomRangeError(null);
              }}
              className="min-h-[40px] rounded-xl border border-kal-border bg-kal-card-muted/60 px-3 text-sm text-kal-text outline-none transition-colors focus:border-kal-accent/50"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApplyCustomRange}
              disabled={!canApplyCustomRange}
              className="min-h-[40px] w-full rounded-xl border border-kal-accent/40 bg-kal-accent/10 px-4 text-sm font-semibold text-kal-accent transition-colors hover:bg-kal-accent/15 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Apply
            </button>
          </div>
        </div>
        {customRangeError ?? liveCustomRangeError ? (
          <p className="mb-3 text-xs font-medium text-[var(--kal-danger-text)]">
            {customRangeError ?? liveCustomRangeError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {SAVED_PLANS_FILTER_OPTIONS.map((filter) => {
            const active = appliedCustomWindow === null && filter.id === activeFilter;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => handlePresetFilterClick(filter.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                  active
                    ? "border-kal-accent bg-kal-accent text-white"
                    : "border-kal-border bg-kal-card-muted/60 text-kal-muted hover:border-kal-accent/40 hover:text-kal-text"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-kal-accent/40 bg-kal-accent-soft/40 px-4 py-3 text-sm text-kal-text">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="kal-glass-panel flex items-center gap-2 rounded-2xl px-4 py-4 text-sm text-kal-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading saved plans...
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="kal-glass-panel rounded-3xl border border-dashed border-kal-border px-6 py-12 text-center">
          <p className="text-base font-semibold text-kal-text">No saved plans in this range yet</p>
          <p className="mt-2 text-sm text-kal-muted">
            Start with today&apos;s planner and your plans will appear here automatically.
          </p>
          <Link
            href="/daily-plan"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-kal-accent/40 bg-kal-accent/10 px-4 py-2 text-sm font-semibold text-kal-accent hover:bg-kal-accent/15"
          >
            Open Today&apos;s Planner ({today})
          </Link>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="space-y-4">
          {items.map((plan) => {
            const expanded = expandedPlanDate === plan.planDate;
            return (
              <li key={plan.id} className="space-y-3">
                <button
                  type="button"
                  onClick={() => setExpandedPlanDate((prev) => (prev === plan.planDate ? null : plan.planDate))}
                  className="kal-glass-panel w-full rounded-3xl px-5 py-5 text-left transition-colors hover:border-kal-accent/35 sm:px-6"
                  aria-expanded={expanded}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-kal-text sm:text-lg">
                        {plan.formattedDate}
                      </p>
                      <p className="mt-1 text-sm text-kal-muted">
                        {plan.completedTasks}/{plan.totalTasks} tasks completed
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-kal-border bg-kal-card-muted/60 px-3 py-1 text-xs font-semibold text-kal-muted">
                      <CheckCircle2 className="h-3.5 w-3.5 text-kal-accent" aria-hidden />
                      {plan.completionPercent}% completed
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-kal-card-muted/80">
                      <div
                        className="h-full rounded-full bg-kal-accent transition-all"
                        style={{ width: `${plan.completionPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {plan.previewTitles.length > 0 ? (
                      plan.previewTitles.map((title, idx) => (
                        <span
                          key={`${plan.id}-preview-${idx}`}
                          className="rounded-full border border-kal-border bg-kal-card-muted/50 px-2.5 py-1 text-xs text-kal-muted"
                        >
                          {title}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-kal-muted">No task titles saved for this day.</span>
                    )}
                  </div>

                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-kal-accent">
                    {expanded ? "Hide details" : "Open full day details"}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </div>
                </button>

                {expanded ? (
                  <div className="px-1 sm:px-2">
                    <UnifiedDailyPlanList
                      planDate={plan.planDate}
                      title={`Daily plan details — ${plan.formattedDate}`}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {!loading && hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadPage(pageIndex + 1, "append")}
            className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted/70 px-4 py-2 text-sm font-semibold text-kal-muted hover:border-kal-accent/40 hover:text-kal-text disabled:opacity-60"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {loadingMore ? "Loading more..." : "Load more plans"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
