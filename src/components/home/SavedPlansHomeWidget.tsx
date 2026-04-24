"use client";

import { CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  SAVED_PLANS_PAGE_SIZE,
  toSavedPlanListItem,
  type SavedPlanListItem,
  type SavedPlanListRowRaw,
} from "@/lib/savedPlans";
import { useAuthStore } from "@/store/useAuthStore";
import { toUserFacingMessage } from "@/lib/userFacingErrors";

const HOME_PAGE_SIZE = 5;

/**
 * Dashboard accordion: last few saved daily plans with completion + worked vs planned.
 */
export function SavedPlansHomeWidget() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<SavedPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: queryError } = await supabase
        .from("daily_plans")
        .select(
          "id, plan_date, daily_tasks(status, title, actual_worked_minutes, time_start, time_end)",
        )
        .eq("user_id", user.id)
        .order("plan_date", { ascending: false })
        .range(0, Math.min(HOME_PAGE_SIZE, SAVED_PLANS_PAGE_SIZE) - 1);

      if (queryError) throw queryError;
      const mapped = ((data ?? []) as SavedPlanListRowRaw[]).map(toSavedPlanListItem);
      setItems(mapped);
    } catch (err) {
      setError(toUserFacingMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) {
    return (
      <p className="rounded-2xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        Sign in to see your saved daily plans.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-kal-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading saved plans…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-[var(--kal-danger-text)]">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-kal-border/80 px-4 py-6 text-center">
        <p className="text-sm text-kal-muted">No saved plans yet.</p>
        <p className="mt-1 text-xs text-kal-muted">
          Your past daily plans will show up here automatically.
        </p>
        <Link
          href="/daily-plan"
          className="mt-3 inline-block text-sm font-semibold text-kal-accent hover:underline"
        >
          Open Today's Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((plan) => (
          <li
            key={plan.id}
            className="flex min-w-0 flex-wrap items-start justify-between gap-2 rounded-2xl border border-kal-border/70 bg-kal-card-muted/30 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-kal-text [overflow-wrap:anywhere]">
                {plan.formattedDate}
              </p>
              <p className="mt-0.5 text-xs text-kal-muted">
                {plan.completedTasks}/{plan.totalTasks} done · {plan.totalWorkedMinutes} min logged
                {plan.totalPlannedMinutes > 0 ? (
                  <>
                    {" · "}
                    {plan.workedVsPlannedPercent != null ? (
                      <span>Worked vs planned: {plan.workedVsPlannedPercent}%</span>
                    ) : (
                      <span>Worked vs planned: Not tracked</span>
                    )}
                  </>
                ) : null}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-kal-border/80 bg-kal-card-muted/60 px-2 py-0.5 text-[10px] font-bold text-kal-muted">
              <CheckCircle2 className="h-3 w-3 text-kal-accent" aria-hidden />
              {plan.completionPercent}%
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/saved-plans"
        className="inline-flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl border border-kal-accent/40 bg-kal-accent/10 px-4 py-2.5 text-sm font-semibold text-kal-accent transition-colors hover:bg-kal-accent/15"
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
        View all saved plans
      </Link>
    </div>
  );
}
