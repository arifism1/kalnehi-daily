"use client";

import clsx from "clsx";
import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BACKLOGS_PATH } from "@/lib/backlogsRoutes";
import { BacklogTrackerClient } from "@/components/backlog/BacklogTrackerClient";
import { TaskListClient } from "@/components/backlog/TaskListClient";

import type {
  TaskListBacklogRow,
  TaskListPlannedRow,
} from "@/actions/backlogRecovery";

type Tab = "list" | "schedule";

function tabFromSearch(sp: URLSearchParams): Tab {
  return sp.get("tab") === "schedule" ? "schedule" : "list";
}

type PlannedWindow = { fromYmd: string; toYmd: string };

export type BacklogsTabsClientProps = {
  initialUnplanned: TaskListBacklogRow[];
  initialUnplannedTotal: number;
  initialPlannedByDate: Record<string, TaskListPlannedRow[]>;
  initialServerTodayYmd: string;
  initialPlannedWindow: PlannedWindow;
};

export function BacklogsTabsClient({
  initialUnplanned,
  initialUnplannedTotal,
  initialPlannedByDate,
  initialServerTodayYmd,
  initialPlannedWindow,
}: BacklogsTabsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = tabFromSearch(searchParams);

  const setTab = useCallback(
    (next: Tab) => {
      const q = next === "schedule" ? "?tab=schedule" : "";
      router.replace(`${BACKLOGS_PATH}${q}`, { scroll: false });
    },
    [router],
  );

  return (
    <div className="mx-auto max-w-lg pb-4">
      <header className="mb-6 space-y-1">
        <p className="kal-category-label text-kal-accent">Backlogs</p>
        <h1 className="kal-feature-title">Backlogs</h1>
        <p className="text-sm text-kal-muted">
          Review what&apos;s planned, capture new items, and schedule them into your daily plan — all in one place.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Backlogs views"
        className="mb-6 flex gap-1 rounded-xl border border-kal-border bg-kal-card-muted/40 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "list"}
          id="backlogs-tab-list"
          aria-controls="backlogs-panel-list"
          className={clsx(
            "min-h-[44px] flex-1 rounded-lg px-3 text-sm font-semibold transition-colors",
            tab === "list"
              ? "bg-kal-card text-kal-text shadow-sm"
              : "text-kal-muted hover:text-kal-text",
          )}
          onClick={() => setTab("list")}
        >
          List
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "schedule"}
          id="backlogs-tab-schedule"
          aria-controls="backlogs-panel-schedule"
          className={clsx(
            "min-h-[44px] flex-1 rounded-lg px-3 text-sm font-semibold transition-colors",
            tab === "schedule"
              ? "bg-kal-card text-kal-text shadow-sm"
              : "text-kal-muted hover:text-kal-text",
          )}
          onClick={() => setTab("schedule")}
        >
          Schedule
        </button>
      </div>

      <div
        role="tabpanel"
        id="backlogs-panel-list"
        aria-labelledby="backlogs-tab-list"
        hidden={tab !== "list"}
      >
        {tab === "list" ? (
          <TaskListClient
            initialUnplanned={initialUnplanned}
            initialUnplannedTotal={initialUnplannedTotal}
            initialPlannedByDate={initialPlannedByDate}
            initialServerTodayYmd={initialServerTodayYmd}
            initialPlannedWindow={initialPlannedWindow}
          />
        ) : null}
      </div>

      <div
        role="tabpanel"
        id="backlogs-panel-schedule"
        aria-labelledby="backlogs-tab-schedule"
        hidden={tab !== "schedule"}
      >
        {tab === "schedule" ? <BacklogTrackerClient /> : null}
      </div>
    </div>
  );
}
