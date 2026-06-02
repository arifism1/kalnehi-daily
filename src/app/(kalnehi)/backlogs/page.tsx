import { Suspense } from "react";
import Link from "next/link";

import { APP_DASHBOARD_PATH } from "@/config/appRoutes";
import { fetchTaskListPayload } from "@/actions/backlogRecovery";
import { BacklogsTabsClient } from "@/components/backlog/BacklogsTabsClient";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("backlogs");

function BacklogsTabsFallback() {
  return (
    <div className="mx-auto max-w-lg animate-pulse space-y-4 pb-20">
      <div className="h-10 rounded-lg bg-kal-card-muted" />
      <div className="h-11 rounded-xl bg-kal-card-muted" />
      <div className="h-48 rounded-xl bg-kal-card-muted" />
    </div>
  );
}

export default async function BacklogsPage() {
  const data = await fetchTaskListPayload();
  if (!data.ok) {
    return (
      <p className="mx-auto max-w-lg rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        {data.error}{" "}
        <Link href={APP_DASHBOARD_PATH} className="font-semibold text-kal-accent underline">
          Dashboard
        </Link>
      </p>
    );
  }

  return (
    <Suspense fallback={<BacklogsTabsFallback />}>
      <BacklogsTabsClient
        initialUnplanned={data.unplanned}
        initialUnplannedTotal={data.unplannedTotal}
        initialPlannedByDate={data.plannedByDate}
        initialServerTodayYmd={data.todayYmd}
        initialPlannedWindow={data.plannedWindow}
      />
    </Suspense>
  );
}
