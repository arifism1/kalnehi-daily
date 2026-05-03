import Link from "next/link";

import { fetchTaskListPayload } from "@/actions/backlogRecovery";
import { TaskListClient } from "@/components/backlog/TaskListClient";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("taskList");

export default async function TaskListPage() {
  const data = await fetchTaskListPayload();
  if (!data.ok) {
    return (
      <p className="mx-auto max-w-lg rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        {data.error}{" "}
        <Link href="/home" className="font-semibold text-kal-accent underline">
          Home
        </Link>
      </p>
    );
  }

  return (
    <TaskListClient
      initialUnplanned={data.unplanned}
      initialUnplannedTotal={data.unplannedTotal}
      initialPlannedByDate={data.plannedByDate}
      initialServerTodayYmd={data.todayYmd}
    />
  );
}
