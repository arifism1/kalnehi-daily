import type { SupabaseClient } from "@supabase/supabase-js";

import { computeWeightedCompletionPercent, isTaskCompleted } from "@/lib/progressEngine";
import type { Database } from "@/types/supabase";
import type { Microtopic, Task } from "@/store/useTaskStore";

export type MasterTodayServerMetrics = {
  totalCount: number;
  doneCount: number;
  percent: number;
  source: "daily_tasks" | "academic_tasks" | "none";
};

function progressFromDailyTaskRows(
  rows: Array<{ status: string }> | null | undefined,
): MasterTodayServerMetrics {
  if (!rows?.length) {
    return { totalCount: 0, doneCount: 0, percent: 0, source: "none" };
  }
  const totalCount = rows.length;
  const doneCount = rows.filter((r) => r.status === "done").length;
  const percent = Math.round((doneCount / totalCount) * 100);
  return { totalCount, doneCount, percent, source: "daily_tasks" };
}

/**
 * Mirrors home “Master Today”: prefer unified `daily_tasks` for the plan date,
 * else weighted completion from `tasks` + `syllabus_master` for that calendar date.
 */
export async function resolveMasterTodayMetrics(
  admin: SupabaseClient<Database>,
  userId: string,
  planDate: string,
): Promise<MasterTodayServerMetrics> {
  const { data: plan } = await admin
    .from("daily_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();

  if (plan?.id) {
    const { data: taskRows } = await admin
      .from("daily_tasks")
      .select("status")
      .eq("daily_plan_id", plan.id);
    const m = progressFromDailyTaskRows(taskRows);
    if (m.totalCount > 0) return m;
  }

  const { data: tasks } = await admin
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("assigned_date", planDate);

  if (!tasks?.length) {
    return { totalCount: 0, doneCount: 0, percent: 0, source: "none" };
  }

  const typedTasks = tasks as Task[];
  const microIds = [
    ...new Set(
      typedTasks
        .map((t) => t.microtopic_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const microMap: Record<string, Microtopic> = {};
  const chunkSize = 120;
  for (let i = 0; i < microIds.length; i += chunkSize) {
    const slice = microIds.slice(i, i + chunkSize);
    const { data: microRows } = await admin
      .from("syllabus_master")
      .select("*")
      .in("id", slice);
    for (const m of microRows ?? []) {
      microMap[m.id] = m as Microtopic;
    }
  }

  const percent = computeWeightedCompletionPercent(typedTasks, microMap);
  const doneCount = typedTasks.filter(isTaskCompleted).length;
  return {
    totalCount: typedTasks.length,
    doneCount,
    percent,
    source: "academic_tasks",
  };
}
