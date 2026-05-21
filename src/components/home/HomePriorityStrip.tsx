"use client";

import clsx from "clsx";
import { LineChart, ListTodo } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { isOverduePendingRevisionReminder } from "@/lib/engine/revisionSchedule";
import {
  filterTasksForDate,
  findMissedIncompleteTasks,
} from "@/lib/progressEngine";
import {
  hydrateUserPlannerTextRevisionsFromServer,
  normalizePlannerTextBundle,
} from "@/lib/userPlannerTextClient";
import { getUserPlannerTextBundleCached } from "@/lib/userPlannerTextLocal";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";

type PriorityCard = {
  id: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  status: string;
};

function SkeletonCard() {
  return (
    <div
      className="h-[72px] w-[140px] shrink-0 animate-pulse rounded-[10px] bg-kal-border/30"
      aria-hidden
    />
  );
}

function PriorityCardItem({ card }: { card: PriorityCard }) {
  const Icon = card.icon;
  return (
    <li role="listitem">
      <Link
        href={card.href}
        className={clsx(
          "flex h-[72px] w-[140px] shrink-0 flex-col justify-between rounded-[10px] border border-kal-border/70 bg-white p-[10px]",
          "outline-none transition-colors hover:bg-[#FAFAFA]",
          "focus-visible:ring-2 focus-visible:ring-[#BA7517] focus-visible:ring-offset-2",
          "dark:bg-zinc-900/80",
        )}
        aria-label={`${card.name} — ${card.status}`}
      >
        <Icon className="size-4 shrink-0 text-kal-accent" aria-hidden />
        <div>
          <p className="text-[12px] font-medium leading-tight text-kal-text">{card.name}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-kal-muted">{card.status}</p>
        </div>
      </Link>
    </li>
  );
}

export function HomePriorityStrip() {
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const tasksHydrated = useTaskStore((s) => s.hydrated);
  const [missedRevCount, setMissedRevCount] = useState(0);

  const { todayTasks, missedTasks } = useMemo(() => {
    const all = Object.values(tasksRecord);
    return {
      todayTasks: filterTasksForDate(all, today),
      missedTasks: findMissedIncompleteTasks(all, today),
    };
  }, [tasksRecord, today]);

  useEffect(() => {
    if (!userId) {
      setMissedRevCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      // Seed from IDB cache immediately for an instant badge count.
      if (cancelled) return;
      const cached = await getUserPlannerTextBundleCached(userId);
      if (cached && !cancelled) {
        setMissedRevCount(
          normalizePlannerTextBundle(cached).revisionItems.filter((r) =>
            isOverduePendingRevisionReminder(r, today),
          ).length,
        );
      }
      // Revision-only sync: one table, no productivity/todos/prefs overhead.
      if (cancelled) return;
      const b = await hydrateUserPlannerTextRevisionsFromServer(userId);
      if (cancelled) return;
      setMissedRevCount(
        b.revisionItems.filter((r) => isOverduePendingRevisionReminder(r, today))
          .length,
      );
    })();
    const onPlanner = () => {
      void getUserPlannerTextBundleCached(userId).then((b) => {
        if (!b) return;
        setMissedRevCount(
          b.revisionItems.filter((r) => isOverduePendingRevisionReminder(r, today))
            .length,
        );
      });
    };
    window.addEventListener("kalnehi-user-planner-text-changed", onPlanner);
    return () => {
      cancelled = true;
      window.removeEventListener("kalnehi-user-planner-text-changed", onPlanner);
    };
  }, [userId, today]);

  const cards = useMemo((): PriorityCard[] => {
    const result: PriorityCard[] = [];
    const missedTotal = missedTasks.length + missedRevCount;

    if (todayTasks.length === 0) {
      result.push({
        id: "daily-plan",
        href: "/daily-plan",
        icon: ListTodo,
        name: "Today's Plan",
        status: "No plan yet",
      });
    }

    if (missedTotal > 0) {
      result.push({
        id: "missed-tasks",
        href: "/missed-tasks",
        icon: LineChart,
        name: "Missed Tasks",
        status: `${missedTotal} missed`,
      });
    }

    return result;
  }, [todayTasks.length, missedTasks.length, missedRevCount]);

  if (tasksHydrated && cards.length === 0) {
    return null;
  }

  return (
    <section aria-label="Needs attention" className="space-y-2">
      <p className="text-[12px] font-medium uppercase tracking-[0.07em] text-kal-muted">
        Needs attention
      </p>

      {!tasksHydrated ? (
        <div className="flex gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <ul
          role="list"
          className="flex gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain [touch-action:pan-x] pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cards.map((card) => (
            <PriorityCardItem key={card.id} card={card} />
          ))}
        </ul>
      )}
    </section>
  );
}
