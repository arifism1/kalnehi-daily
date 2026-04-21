"use client";

import clsx from "clsx";
import {
  CheckCircle2,
  Clock,
  Inbox,
  LineChart,
  ListTodo,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import {
  filterTasksForDate,
  findMissedIncompleteTasks,
} from "@/lib/progressEngine";
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

function AllCaughtUp() {
  return (
    <div
      role="listitem"
      className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3"
      style={{ background: "#EAF3DE" }}
    >
      <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "#3B6D11" }} aria-hidden />
      <p className="text-sm font-medium" style={{ color: "#3B6D11" }}>
        You&apos;re all caught up today
      </p>
    </div>
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
        <Icon className="h-4 w-4 shrink-0 text-kal-accent" aria-hidden />
        <div>
          <p className="text-[12px] font-medium leading-tight text-kal-text">{card.name}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-kal-muted">{card.status}</p>
        </div>
      </Link>
    </li>
  );
}

export function HomePriorityStrip() {
  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const tasksHydrated = useTaskStore((s) => s.hydrated);

  const { todayTasks, missedTasks } = useMemo(() => {
    const all = Object.values(tasksRecord);
    return {
      todayTasks: filterTasksForDate(all, today),
      missedTasks: findMissedIncompleteTasks(all, today),
    };
  }, [tasksRecord, today]);

  const pendingTasks = useMemo(() => {
    return Object.values(tasksRecord).filter(
      (t) => t.status !== "completed" && t.assigned_date && t.assigned_date < today,
    );
  }, [tasksRecord, today]);

  const cards = useMemo((): PriorityCard[] => {
    const result: PriorityCard[] = [];

    if (todayTasks.length === 0) {
      result.push({
        id: "daily-plan",
        href: "/daily-plan",
        icon: ListTodo,
        name: "Daily Plan",
        status: "No plan yet",
      });
    }

    if (pendingTasks.length > 0) {
      result.push({
        id: "pending",
        href: "/pending",
        icon: Inbox,
        name: "Pending Tasks",
        status: `${pendingTasks.length} pending`,
      });
    }

    if (missedTasks.length > 0) {
      result.push({
        id: "missed-tasks",
        href: "/missed-tasks",
        icon: LineChart,
        name: "Missed Tasks",
        status: `${missedTasks.length} missed`,
      });
    }

    return result;
  }, [todayTasks.length, pendingTasks, missedTasks]);

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
      ) : cards.length === 0 ? (
        <ul role="list">
          <AllCaughtUp />
        </ul>
      ) : (
        <ul
          role="list"
          className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cards.map((card) => (
            <PriorityCardItem key={card.id} card={card} />
          ))}
        </ul>
      )}
    </section>
  );
}
