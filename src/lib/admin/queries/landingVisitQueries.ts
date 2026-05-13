import { addDaysISTKey, todayISTKey } from "@/lib/admin/istDates";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type LandingVisitSnapshot = {
  totalLast7d: number;
  totalLast30d: number;
  visitsByDay: { day: string; count: number }[];
  visitsByPath: { path: string; count: number }[];
};

export async function getLandingVisitSnapshot(): Promise<LandingVisitSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const today = todayISTKey();
  const start30 = addDaysISTKey(today, -29);

  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    dayKeys.push(addDaysISTKey(today, -i));
  }

  const countForDay = (visitDateIst: string) =>
    admin
      .from("landing_page_visits")
      .select("*", { count: "exact", head: true })
      .eq("visit_date_ist", visitDateIst);

  const countWindow = (fromInclusive: string) =>
    admin
      .from("landing_page_visits")
      .select("*", { count: "exact", head: true })
      .gte("visit_date_ist", fromInclusive)
      .lte("visit_date_ist", today);

  const pathCounts = (path: string) =>
    admin
      .from("landing_page_visits")
      .select("*", { count: "exact", head: true })
      .eq("path", path)
      .gte("visit_date_ist", start30)
      .lte("visit_date_ist", today);

  const [last7dSlices, last30dTotal, homeCount, marketingCount, pricingCount] =
    await Promise.all([
      Promise.all(dayKeys.map((d) => countForDay(d))),
      countWindow(start30),
      pathCounts("/"),
      pathCounts("/kalnehi-daily"),
      pathCounts("/pricing"),
    ]);

  const visitsByDay = dayKeys.map((day, i) => ({
    day,
    count: last7dSlices[i].count ?? 0,
  }));

  const totalLast7d = visitsByDay.reduce((s, r) => s + r.count, 0);

  return {
    totalLast7d,
    totalLast30d: last30dTotal.count ?? 0,
    visitsByDay,
    visitsByPath: [
      { path: "/", count: homeCount.count ?? 0 },
      { path: "/kalnehi-daily", count: marketingCount.count ?? 0 },
      { path: "/pricing", count: pricingCount.count ?? 0 },
    ],
  };
}
