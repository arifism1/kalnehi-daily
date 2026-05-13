import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type AdminTaskRow = {
  id: string;
  plan_date: string;
  title: string;
  status: string;
  priority: string;
  source: string;
  actual_worked_minutes: number;
  estimated_minutes: number | null;
  time_slot: string | null;
  created_at: string;
  updated_at: string;
};

export type UserDailyTaskHistory = {
  rows: AdminTaskRow[];
  totalCount: number;
};

export async function getUserDailyTaskHistory(
  userId: string,
  limitDays = 30,
): Promise<UserDailyTaskHistory> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return { rows: [], totalCount: 0 };

  const since = new Date(Date.now() - limitDays * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  // Fetch plan IDs for this user within the date window
  const { data: plans, error: plansErr } = await admin
    .from("daily_plans")
    .select("id, plan_date")
    .eq("user_id", userId)
    .gte("plan_date", since)
    .order("plan_date", { ascending: false });

  if (plansErr) {
    console.warn("[taskHistoryQueries] plans fetch:", plansErr.message);
    return { rows: [], totalCount: 0 };
  }

  if (!plans || plans.length === 0) return { rows: [], totalCount: 0 };

  const planIds = plans.map((p) => p.id);
  const planDateById = Object.fromEntries(plans.map((p) => [p.id, p.plan_date]));

  const { data: tasks, count, error: tasksErr } = await admin
    .from("daily_tasks")
    .select(
      "id, daily_plan_id, title, status, priority, source, actual_worked_minutes, estimated_minutes, time_slot, created_at, updated_at",
      { count: "exact" },
    )
    .in("daily_plan_id", planIds)
    .order("created_at", { ascending: false });

  if (tasksErr) {
    console.warn("[taskHistoryQueries] tasks fetch:", tasksErr.message);
    return { rows: [], totalCount: 0 };
  }

  const rows: AdminTaskRow[] = (
    tasks as {
      id: string;
      daily_plan_id: string;
      title: string;
      status: string;
      priority: string;
      source: string;
      actual_worked_minutes: number;
      estimated_minutes: number | null;
      time_slot: string | null;
      created_at: string;
      updated_at: string;
    }[]
  ).map((t) => ({
    id: t.id,
    plan_date: planDateById[t.daily_plan_id] ?? "",
    title: t.title,
    status: t.status,
    priority: t.priority,
    source: t.source,
    actual_worked_minutes: t.actual_worked_minutes,
    estimated_minutes: t.estimated_minutes,
    time_slot: t.time_slot,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));

  return { rows, totalCount: count ?? rows.length };
}
